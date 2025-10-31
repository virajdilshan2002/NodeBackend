import Joi from "joi";

export const itemjoiSchema = Joi.object({
    name: Joi.string().trim().max(30).required(),
    qty: Joi.number().integer().min(1).required(),
    price: Joi.number().precision(2).min(0).required(),
});

export const itemFormjoiSchema = Joi.object({
    itemCount: Joi.number().integer().min(1).required(),
    totalPrice: Joi.number().precision(2).min(0).required(),
    items: Joi.array().items(itemjoiSchema).min(1).required()
})