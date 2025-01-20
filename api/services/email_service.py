import os
import logging

from mailjet_rest import Client


mailjet_client = Client(
    auth=(
        os.getenv("MAILJET_API_KEY"),
        os.getenv("MAILJET_SECRET_KEY"),
    ),
    version='v3.1',
)


def send_confirmation_email(
    email, verification_endpoint,
):

    sender_email = "no-reply@appsquad.com"
    sender_name = "No reply"

    html_content = f"""\
<h1 style="color: #4a4a4a;">Welcome to AppSquad!</h1>
<p>Dear User,</p>
<p>Thank you for signing up. To complete your registration, please verify your email address by clicking the button below:</p>
<p style="text-align: center;">
    <a href="{verification_endpoint}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
</p>
<p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
<p><a href="{verification_endpoint}">{verification_endpoint}</a></p>
<p>If you didn't create an account with us, please disregard this email.</p>
<p>Best regards,<br>AppSquad</p>"""

    text_content = f"""\
Welcome to AppSquad!

Dear User,

Thank you for signing up. To complete your registration, please verify your email address by clicking the link below:

{verification_endpoint}

If you didn't create an account with us, please disregard this email.

Best regards,
AppSquad"""

    data = {
        'Messages': [{
            "Subject": "Verify Email Address",

            "From": {
                "Email": sender_email,
                "Name": sender_name,
            },
            "To": [{
                "Email": email,
                "Name": "You"
            }],

            "TextPart": text_content,
            "HTMLPart": html_content,
        }]
    }

    result = mailjet_client.send.create(data=data)

    if result.status_code != 200:
        logging.error(f"mailjet sent non-200 status code ({result.status_code}): {result.json()}")


def send_password_reset_email(email, reset_endpoint):
    sender_email = "no-reply@appsquad.com"
    sender_name = "No reply"

    html_content = f"""\
<h1 style="color: #4a4a4a;">Password Reset Request</h1>
<p>Dear User,</p>
<p>We received a request to reset your password. If you didn't make this request, you can ignore this email. Otherwise, please click the button below to reset your password:</p>
<p style="text-align: center;">
    <a href="{reset_endpoint}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
</p>
<p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
<p><a href="{reset_endpoint}">{reset_endpoint}</a></p>
<p>This link will expire in 1 hour for security reasons.</p>
<p>If you didn't request a password reset, please contact our support team immediately.</p>
<p>Best regards,<br>AppSquad</p>"""

    text_content = f"""\
Password Reset Request

Dear User,

We received a request to reset your password. If you didn't make this request, you can ignore this email. Otherwise, please click the link below to reset your password:

{reset_endpoint}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please contact our support team immediately.

Best regards,
AppSquad"""

    data = {
        'Messages': [{
            "Subject": "Password Reset Request",
            "From": {
                "Email": sender_email,
                "Name": sender_name,
            },
            "To": [{
                "Email": email,
                "Name": "You"
            }],
            "TextPart": text_content,
            "HTMLPart": html_content,
        }]
    }

    result = mailjet_client.send.create(data=data)

    if result.status_code != 200:
        logging.error(f"mailjet sent non-200 status code ({result.status_code}): {result.json()}")


async def send_feedback_by_email(feedback, rating, user_email: str):
    subject = f"New Feedback (Rating: {rating}/5)"
    content = f"User Email: {user_email}\n\nRating: {rating}/5\n\nFeedback:\n{feedback}"

    data = {
        'Messages': [{
            "From": {
                "Email": "no-reply@appsquad.com",
                "Name": "AppSquad Feedback"
            },
            "To": [{
                "Email": "vltn.dematos@gmail.com",
                "Name": "Feedback Recipient"
            }],
            "Subject": subject,
            "TextPart": content,
        }]
    }

    response = mailjet_client.send.create(data=data)

    if response.status_code != 200:
        raise Exception("Failed to send feedback email")

    return {"message": "Feedback submitted successfully"}
