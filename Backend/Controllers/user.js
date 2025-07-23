import { ApiError } from "../Utils/ApiError.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { FileUpload } from "../Utils/PostUpload.js";
import ApiResponse from "../Utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import Following from "../models/Following.model.js";
import Post from "../models/Post.model.js";

const registerUser = asyncHandler(async (req, res) => {
  const { FullName, username, email, password } = req.body;
  if ([FullName, username, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const isExist = await User.findOne({ $or: [{ username }, { email }] });
  if (isExist) {
    throw new ApiError(400, "User already exists");
  }

  const avatarLocalPath = req.files?.Avatar[0]?.path;

  const postString = await FileUpload(avatarLocalPath);

  const newUser = await User.create({
    FullName,
    username,
    email,
    password,
    Avatar: postString?.url || "",
  });

  const checkUser = await User.findById(newUser._id).select("-password -refreshToken");
  if (!checkUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  res.status(201).json(new ApiResponse(200, checkUser, "Registered User Successfully"));
});

const loginuser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(400, "Unauthorized User");
  }

  const check = await user.isPasswordCorrect(password);
  if (!check) {
    throw new ApiError(400, "Incorrect Password");
  }
  const AccessToken = jwt.sign({
    _id: user.id, Username: user.username,
  }, process.env.TOKEN);

  return res.status(200).json(new ApiResponse(200, { user: user._id, Token: AccessToken }, "User Successfully Login"));
});

const Makesearchwrequest = asyncHandler(async(req,res) =>{
  const {search} = req.query;
  try{
    const regexPattern = new RegExp(`^${search}`, 'i');

    // Find all users whose names match the regex pattern
    const users = await User.find({ username: regexPattern }).select("-password -email");
    return res.status(200).json(new ApiResponse(200, users, " Successfully search"));
  }
  catch{
    throw new ApiError(405, "Somethings Went Wrongs");
  }
})

const CurrentUserPassword = asyncHandler(async (req, res) => {

  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.body?._id);
    const check = await user.isPasswordCorrect(oldPassword);
    
    if (!check) {
      throw new ApiError(405, "Not Correct Password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: true });

    return res.status(200).json(new ApiResponse(200, {}, "Successfully changed password"));
  } catch (error) {
    // Handle errors
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
});


const CurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Get Current User"));
});

const UpdateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.files?.Avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(405, "Avatar Missing");
  }

  const avatar = await FileUpload(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(405, "Avatar Uploading Api Error");
  }
  const user = await User.findById(req.body?._id);
  user.Avatar = avatar.url;
  await user.save({ validateBeforeSave: true });

  return res.status(200).json(new ApiResponse(200, {}, "Avatar Change Successfully"));
});

const getProfileofUser = asyncHandler(async (req, res) => {

  const countFollowing = await Following.countDocuments({ follows: req.body._id });
  const countFollower = await Following.countDocuments({ follower: req.body._id });
  const getProfileofUser = await User.findOne({ username: (req.body.username === null || req.body.username === undefined) ? req.body.Username : req.body.username });
  if (!getProfileofUser) {
    throw new ApiError(406, "Something Wrong while Getting Profile");
  }
  const Posts = await Post.find({owner:getProfileofUser._id});
  const getData = {
    Profiledata: getProfileofUser,
    countFollowing: countFollowing,
    countFollower: countFollower,
    Posts:Posts,
  }
  return res.status(200).json(new ApiResponse(200, getData, "Get User Profile Successfully"));
});

const getProfileofAlt = asyncHandler(async (req, res) => {
  const {Username , _id} = req.body;
  if(req.query._id._id == undefined){
    throw new ApiError(405, "Not Access to get");
  }
  try{ const user = await User.findById(req.query._id._id);
    const countFollowing = await Following.countDocuments({ follows:  req.query._id._id});
    const countFollower = await Following.countDocuments({ follower: req.query._id._id });

  let isyouraccount = (req.query._id._id === _id);
  let isfollowing = false;
  const find = await Following.findOne({$and: [{follower:_id} , {follows : req.query._id._id}]});
  if(find){
    isfollowing = true;
  }
  const Posts = await Post.find({owner:req.query._id._id});  
  const getData = {
    Profiledata: user,
    isfollowing: isfollowing,
    isyouraccount: isyouraccount,
    countFollowing: countFollowing,
    countFollower: countFollower,
    Posts:Posts,
  }
  return res.status(200).json(new ApiResponse(200, getData, "Get User Profile Successfully"));}
  catch{
    throw new ApiError(405, "Get Some Problem while Fectching the data");
  }
});

const Followrequest = asyncHandler(async(req,res) => {
   const {_id ,Username} = req.body;
   if(req.body.user_id._id == undefined){
    throw new ApiError(402," Something Went Wrong in Following ");
   }
   try{
    const findfollow = await Following.findOne({$and : [{ follows :req.body.user_id._id},{follower: _id}]}) ;
  if(!findfollow){
     await Following.create({
    follows :req.body.user_id._id,
    follower: _id
   });
   const countFollowing = await Following.countDocuments({ follows: req.body.user_id._id });
   const countFollower = await Following.countDocuments({ follower: req.body.user_id._id });
     return res.status(200).json( new ApiResponse(200, {followers:countFollower , following : countFollowing , isfollowing:true}," Succefully Follow "));
   }
  else{
    await Following.deleteOne({
      follows :req.body.user_id._id,
      follower: _id
     });
     const countFollowing = await Following.countDocuments({ follows: req.body.user_id._id });
     const countFollower = await Following.countDocuments({ follower: req.body.user_id._id });
       return res.status(200).json( new ApiResponse(200, {followers:countFollower , following : countFollowing ,  isfollowing:false}," Succefully UnFollow "));
  }
  }
   catch{
    throw new ApiError(403, " Something Wnet Wrong in Following ");
   }
});

const GetAllPost = asyncHandler(async(req, res) => {
  try {
      const { skip = 0, limit = 10 } = req.query;

      // Convert skip and limit to numbers
      const skipCount = parseInt(skip);
      const limitCount = parseInt(limit);

      // Query the database to skip some posts and limit the number of posts returned
      const limitedPosts = await Post.find().skip(skipCount).limit(limitCount);

      // Query the database to get the total count of all posts
      const totalCount = await Post.countDocuments();

      return res.status(200).json({
          success: true,
          data: {
              posts: limitedPosts,
              totalCount: totalCount
          },
          message: "Get AllPost Successfully"
      });
  } catch (error) {
      return res.status(500).json({
          success: false,
          error: "Internal Server Error"
      });
  }
});


export { Makesearchwrequest ,getProfileofAlt, Followrequest,GetAllPost,
  registerUser, loginuser, CurrentUserPassword, CurrentUser, UpdateAvatar, getProfileofUser
};
