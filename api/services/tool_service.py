import os
import re
import logging
import requests

from openai import OpenAI
from urllib.parse import urlparse
from fastapi import HTTPException, status, UploadFile
from database.models import (
    User as UserModel,
    Tool as ToolModel,
    AudioReview as AudioReviewModel
)


openai_client = OpenAI()


def _get_domain_name(url: str):
    # Add scheme if not present
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'http://' + url

    # Parse the URL
    parsed_url = urlparse(url)

    # Extract the domain (network location)
    domain = parsed_url.netloc

    # Remove 'www.' if present
    if domain.startswith('www.'):
        domain = domain[4:]

    return domain

def __verify_domain(domain: str):

    try:
        response = requests.get(
            url=f"https://{domain}",
            timeout=5,
        )

    except requests.exceptions.ReadTimeout:
        logging.warning(f"Couldn't reach domain (timeout): {domain=}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Couldn't reach domain")

    if response.status_code != 200:
        logging.warning(f"Couldn't reach domain {domain=} {response.url=} {response.status_code}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Couldn't reach domain")


def _get_domain_favicon(domain: str):

    response = requests.get(
        url="https://www.google.com/s2/favicons",
        params={
            "domain": domain,
            "size": 256,
        },
        timeout=5,
    )

    if response.status_code != 200:
        logging.error(f"Couldn't retrieve favicon {domain=} {response.status_code=} {response.text=}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Couldn't retrieve favicon")

    return {
        "binary": response.content,
        "url": response.url.replace("size=16", "size=256"),
    }


def __extract_tag_content(text, tag_name):
    pattern = f'<{tag_name}>(.*?)</{tag_name}>'
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None


def _get_product_info(domain: str):

    response = requests.get(
        url=f"https://r.jina.ai/{domain}",
        timeout=15,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Couldn't retrieve website content")

    prompt = """You will be given the content of a website. Your task is to identify the name of the product being described and determine its category (e.g., "front-end framework", "programming language", "database system", etc.).

Here is the website content:
<website_content>
{{WEBSITE_CONTENT}}
</website_content>

To complete this task, follow these steps:

1. Carefully read through the website content.

2. Look for prominent mentions of a product name. This is often found in headings, titles, or the first paragraph of the content. The product name is typically a proper noun or a branded term.

3. Analyze the description and features of the product to determine its category. Look for keywords that indicate the type of technology or tool it is.

4. Once you have identified the product name and category, format your response as follows:

   <name>Insert the product name here</name>
   <category>Insert the product category here</category>

Remember:
- The product name should be the specific name of the tool or technology, not a generic description.
- The category should be a brief (1-4 words) description of the type of product, such as "front-end framework", "programming language", or "database system".
- If you cannot confidently determine either the name or the category, use "Unknown" as the value.

Provide only the name and category in the specified format without any additional explanation or commentary."""

    prompt = prompt.replace("{{WEBSITE_CONTENT}}", response.text)

    completion = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": prompt}
        ],
        timeout=30,
    ).choices[0].message.content

    return {
        "name": __extract_tag_content(text=completion, tag_name="name"),
        "category": __extract_tag_content(text=completion, tag_name="category"),
    }


async def create_new_tool(
    link: str,
    user: UserModel,
):

    domain = _get_domain_name(url=link)
    __verify_domain(domain=domain)

    logo = _get_domain_favicon(domain=domain)["url"]
    info = _get_product_info(domain=domain)

    new_tool = await ToolModel.create(
        name=info["name"],
        category=info["category"],
        link=domain,
        logo=logo,
        user=user,
    )

    return await new_tool


async def add_tool(
    link: str,
    user: UserModel,
):

    if len(await user.tools.all()) >= int(os.getenv("MAX_NB_TOOLS", "10")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="max tools limit reached")

    domain = _get_domain_name(url=link)

    if domain in [_tool.link for _tool in await user.tools.all()]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tool already added")

    tool = await ToolModel.get_or_none(link=domain)

    if tool is None:
        tool = await create_new_tool(link=link, user=user)

    await user.tools.add(tool)

    return await tool.to_schema()


async def get_tool(
    id: int,
):

    tool = await ToolModel.get_or_none(id=id)

    if tool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tool not found")

    return tool


async def remove_tool(
    id: int,
    user: UserModel,
):

    tool = await ToolModel.get_or_none(id=id)
    await user.tools.remove(tool)

    return


async def get_audio_review(
    id: int | None = None,
    tool_id: int | None = None,
    user_id: int | None = None,
):
    if id is None and tool_id is None and user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one parameter (id, tool_id, or user_id) must be provided"
        )

    query = AudioReviewModel.all()

    if id is not None:
        query = query.filter(id=id)
    if tool_id is not None:
        query = query.filter(tool_id=tool_id)
    if user_id is not None:
        query = query.filter(user_id=user_id)

    review = await query.all()

    if review is None or len(review) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    return review[0]


async def update_audio_review(
    tool_id: int,
    audio: UploadFile,
    user: UserModel,
) -> AudioReviewModel:

    tool = await get_tool(id=tool_id)
    audio_data = await audio.read()

    try:
        review = await get_audio_review(tool_id=tool_id, user_id=user.id)
        await review.delete()
    except HTTPException:
        # no review yet for the audio
        pass

    review = await AudioReviewModel.create(
        tool=tool,
        user=user,
        audio_data=audio_data,
    )

    return review


async def delete_audio_review(
    id: int,
    user: UserModel,
):

    review = get_audio_review(id=id)

    await user.reviews.remove(review)

    return
