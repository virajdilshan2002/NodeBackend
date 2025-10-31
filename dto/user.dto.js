import Joi from "joi";

export const UserjoiSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().trim().email().min(5).max(50).required(),
    contact: Joi.string().min(10).max(15).required(),
    password: Joi.string().min(6).max(10).required(),
    role: Joi.string().valid("ADMIN", "USER", "GUEST").required()
})

export class LoginDto {
    constructor({ email, password }) {
        this.email = email;
        this.password = password;
    }
}
