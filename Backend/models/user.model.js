import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    FullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    Avatar: {
        type: String, // cloudinary url
       
    },
    password: {
        type: String,
        required: [true, "Password is Required"],
    },
});

UserSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        try {
            this.password = await bcrypt.hash(this.password, 10);
        } catch (error) {
            return next(error);
        }
    }
    next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", UserSchema);
