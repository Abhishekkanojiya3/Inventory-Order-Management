from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class CustomerBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=40)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        normalized = value.replace(" ", "").replace("-", "")
        if not normalized.removeprefix("+").isdigit() or not 10 <= len(normalized.removeprefix("+")) <= 15:
            raise ValueError("Phone number must be 10 to 15 digits and may start with +")
        return value


class CustomerCreate(CustomerBase):
    pass


class CustomerRead(CustomerBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
