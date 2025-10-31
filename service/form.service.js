import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";

export async function writeData(data) {
    const filePath = 'C:\\Users\\viraj\\Desktop\\ExpressJsTest\\items.csv';
    const fileExists = fs.existsSync(filePath);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
        {id: 'name', title: 'NAME'},
        {id: 'qty', title: 'QUANTITY'},
        {id: 'price', title: 'PRICE'}
    ],
    append: fileExists
});
 
await csvWriter.writeRecords(data.items);
    console.log('...Done');
}
