import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generateOrderPDF(order, user) {
  console.log(process.cwd());
  
  const pdfPath = path.join(process.cwd(), "orders" , `order_${order._id}.pdf`);
  const doc = new PDFDocument();

  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  doc.fontSize(20).text("Order Confirmation", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Customer: ${user.email}`);
  doc.text(`Order ID: ${order.orderId}`);
  doc.text(`Item: ${order.item}`);
  doc.text(`Price: $${order.price}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  doc.moveDown();
  doc.text("Thank you for your order!", { align: "center" });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve(pdfPath));
    writeStream.on("error", reject);
  });
}
