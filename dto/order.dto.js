export class OrderDTO {
    constructor(order) {
        this.id = order._id;
        this.item = order.item;
        this.price = order.price;
        this.userId = order.userId;
        this.user = order.userId ? {
            id: order.userId._id,
            name: order.userId.name,
            email: order.userId.email,
        } : null;
    }
}