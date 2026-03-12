import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
{
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true
    },

    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    message: {
        type: String,
        required: true
    },

    read: {
        type: Boolean,
        default: false
    }

},
{ timestamps: true }
)

const Message = mongoose.model("Message", messageSchema)

export default Message