from tortoise import fields, models
from schemas.user import (
    User as _UserSchema,
    UserPrivate as _UserPrivateSchema,
)
from schemas.tool import Tool as ToolSchema
from schemas.audio_review import AudioReview as AudioReviewSchema


# TODO: move to minio
class AudioReview(models.Model):
    id = fields.IntField(pk=True)

    tool = fields.ForeignKeyField('models.Tool', related_name='audio_reviews')
    user = fields.ForeignKeyField('models.User', related_name='audio_reviews')

    audio_data = fields.BinaryField()
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    async def to_schema(self) -> _UserSchema:
        return AudioReviewSchema(
            id=self.id,
            tool=await (await self.tool).to_schema(),
            user=(await (await self.user).to_schema()).to_user_private(),
            audio_data=self.audio_data,
        )

    class Meta:
        table = "audio_reviews"


class Tool(models.Model):
    id = fields.IntField(pk=True)

    link = fields.TextField()
    name = fields.TextField()
    category = fields.TextField()
    logo = fields.TextField()

    audio_reviews = fields.ReverseRelation['AudioReview']

    async def to_schema(self) -> _UserSchema:
        return ToolSchema(
            id=self.id,
            link=self.link,
            name=self.name,
            category=self.category,
            logo=self.logo,
        )

    class Meta:
        table = "tools"


class User(models.Model):
    id = fields.IntField(pk=True)

    url = fields.CharField(max_length=255, unique=True) # TODO
    username = fields.CharField(max_length=255, unique=True)
    email = fields.CharField(max_length=255, unique=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    picture = fields.TextField()

    tools = fields.ManyToManyField('models.Tool', related_name='users')
    audio_reviews = fields.ReverseRelation['AudioReview']

    async def to_schema(self, include_tools: bool = False, user_id: int | None = None) -> _UserSchema:

        tools = [await _tool.to_schema() for _tool in (await self.tools.all())]

        if user_id is None or user_id == self.id:
            schema = _UserSchema(
                id=self.id,
                url=self.url,
                username=self.username,
                email=self.email,
                created_at=self.created_at,
                picture=self.picture,
            )
        else:
            schema = _UserPrivateSchema(
                id=self.id,
                url=self.url,
                username=self.username,
                picture=self.picture,
            )

        if include_tools:
            schema.tools = tools
            # setattr(schema, "tools", tools)

        return schema

    class Meta:
        table = "users"
