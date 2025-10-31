import { itemFormjoiSchema } from "../dto/item.form.dto.js";
import { writeData } from "../service/form.service.js";

export async function saveItems(req, res) {
    const data = req.body;
    console.log(data.itemCount);
    console.log(data.totalPrice);
    console.log(data.items);

    try {
        const value = await itemFormjoiSchema.validateAsync({
            itemCount: data.itemCount,
            totalPrice: data.totalPrice,
            items: data.items
        });

        writeData(value, "items.csv");

        res.status(200).json({ message: "Items saved successfully", data: value });

    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.details[0].message });
    }
    
}