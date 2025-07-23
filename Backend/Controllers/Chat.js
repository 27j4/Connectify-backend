import { ApiError } from "../Utils/ApiError.js";
import ApiResponse from "../Utils/ApiResponse.js";
import { FileUpload } from "../Utils/PostUpload.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import Chat from "../models/Chat.model.js";
import Message from "../models/Message.model.js";
import { User } from "../models/user.model.js";


const createMessage = asyncHandler(async (req,res)=>{
    const {chatid,_id,content} = req.body;
    try{
    const get = await Message.create({
        chat:chatid,
        sender:_id,
        content:content,
    });
  const getnew = await get.populate({
        path:'sender',
        select:"Avatar _id"
    })
    const hello = await getnew.populate({
        path:"chat",
        select:"users"
    });
    await Chat.findByIdAndUpdate(chatid,{
        latestmessage:get._id
    },{
        new:true
    })
    return res.status(200).json(new ApiResponse(200,hello,"Good"));
    }
    catch(err){
        throw new ApiError(404,"Somethings Went Wrong");
    }
});

const getallmessage = asyncHandler(async(req,res)=>{
    const {chatid} = req.query;
    try{
        const get = await Message.find({
            chat:chatid,
        }).populate({path:"sender",
            select:"_id Avatar"
        });
        return res.status(200).json(new ApiResponse(200,get,"Good"));
    }
    catch(err){
            throw ApiError(404,"Somethings Went Wrong");
    }
})

const acesschat = asyncHandler(async (req, res) => {
    const { _id, Username } = req.body;
    const { getid, username } = req.query;
    try {
        // Find the user by username and get their _id
        // const user = await User.findOne({ username }).select('_id')
        // If user not found, send an error response
        if (!getid && !username) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        // Find the chat
        if (getid) {
            try {
                const isChatFind = await Chat.findById(
                    getid
                ).populate({
                    path: 'users',
                    match: { _id: { $ne: _id } }, // Exclude the given _id
                    select: '-password'
                }).
                    populate({
                        path: 'latestmessage',
                        populate: {
                            path: 'sender',
                            select: 'FullName Avatar username'
                        }
                    });
                return res.status(200).json(new ApiResponse(200, isChatFind, " Successfully fetch"));
            }
            catch (err) {
                throw new ApiError(405, "Somethings Went Wrong");
            }
        }
        else {
            const user_id = await User.findOne({ username: username }).select('_id');
            // Create a new chat if not found
            if (user_id._id != _id) {
               
                const findChat = await Chat.findOne({ users: { $all: [user_id._id, _id]}, isgroup: false  })
                    .populate({
                        path: 'users',
                        match: { _id: { $ne: _id } }, // Exclude the given _id
                        select: '-password'
                    }).
                    populate({
                        path: 'latestmessage',
                        populate: {
                            path: 'sender',
                            select: 'FullName Avatar username'
                        }
                    });
                    
                if (findChat ) {
                    return res.status(200).json(new ApiResponse(200, findChat, " Successfully fetch"));;
                }
                const createChat = await Chat.create({
                    chatname: 'jai shree ram',
                    users: [user_id._id, _id],
                    isgroup: false,
                });

                const fullChat = await Chat.findOne({ _id: createChat._id });

                return res.status(200).json(new ApiResponse(200, fullChat, " Successfully fetch"));
            }
            else {
                throw new ApiError(405, "You Cannot create Chat to himself");
            }
        }
    }
    catch (err) {
        throw new ApiError(405, "Some things Went Wrong");
    }
});


const allchat = asyncHandler(async (req, res) => {
    const { _id } = req.body;
    try {
        const chats = await Chat.find({ users: _id })
            .populate({
                path: 'latestmessage',
                populate: {
                    path: 'sender',
                    select: 'FullName Avatar username'
                }
            })
            .populate({
                path: 'users',
                match: { _id: { $ne: _id } }, // Exclude the given _id
                select: '-password'
            })
            .populate('groupAdmin', '-password')
            // .select("chatname" ,"isgroup" )
            .sort({ updatedAt: -1 });

        return res.status(200).json(new ApiResponse(200, chats, " Successfully fetch"));
    } catch (error) {
        console.error(error);
        throw new ApiError(405, "Server error");
    }
});


const creategruop = asyncHandler(async (req, res) => {
     
    if (!req.body.users || !req.body.groupname) {
        throw new ApiError(405, "Fill All reequired Field");
    }
    let users = JSON.parse(req.body.users);
    if (users.length < 2) {
        throw new ApiError(405, "More then two people reqiured");
    }

    try {
        const avatarLocalPath = req.files?.Postimg[0]?.path;
        const postString = await FileUpload(avatarLocalPath);

        const groupget = await Chat.create({
            chatname: req.body.groupname,
            users: users,
            Avatar: postString?.url,
            isgroup: true,
            groupAdmin: req.body._id,
        });
        const get = await Chat.find({ _id: groupget._id }).populate("users", "-password")
            .populate("groupAdmin", "-password");

        return res.status(200).json(new ApiResponse(200, get, " Successfully creataed"));
    }
    catch (error) {
        throw new ApiError(405, "Server error");
    }
});

const rename = asyncHandler(async (req, res) => {
    const { chatid, chatname } = req.body;
    try {
        const getgroup = await Chat.findByIdAndUpdate(
            chatid, {
            chatname
        }, {
            new: true,
        }
        ).populate("users", "-password")
            .populate("groupAdmin", "-password");

        return res.status(200).json(new ApiResponse(200, getgroup, " Successfully creataed"));
    }
    catch (error) {
        throw new ApiError(405, "Server error");
    }
});

const addtogroup = asyncHandler(async (req, res) => {
    const { chatid, user } = req.body;
    try {
        const add = await Chat.findOneAndUpdate(
    {
        $and: [{ _id: chatid }, { groupAdmin: req.body._id }],
    },
    {
        $addToSet: { users: user }, // Ensures the user is not added if already present
    },
    {
        new: true,
    }
).populate("users", "-password")
 .populate("groupAdmin", "-password");

return res.status(200).json(new ApiResponse(200, add, "Successfully updated"));
    }
    catch (error) {
        throw new ApiError(405, "Server error");
    }
})

const deletegroup = asyncHandler(async (req,res)=>{
   const {chatid} = req.body;
       try{
        await Chat.findByIdAndDelete(chatid);
        await Message.deleteMany({chat:chatid});
        return res.status(200).json(new ApiResponse(200, "Delete Group Successfully"))
       }
       catch(err){
        throw new ApiError(405, "Somethings Went Wrong");
       }
})

const removetogroup = asyncHandler(async (req, res) => {
    const { chatid, user } = req.body;
    try {
        console.log(user.userid);
        const add = await Chat.findOneAndUpdate({
            $and: [{ _id: chatid }, { groupAdmin: req.body._id }],
        },
            {
                $pull: { users: user.userid },
            }, {
            new: true,
        }
        ).populate("users", "-password")
            .populate("groupAdmin", "-password");

        return res.status(200).json(new ApiResponse(200, add, " Successfully creataed"));
    }
    catch (error) {
        throw new ApiError(405, "Server error");
    }
})

export { acesschat, allchat, creategruop, rename, addtogroup, removetogroup, deletegroup , createMessage , getallmessage};