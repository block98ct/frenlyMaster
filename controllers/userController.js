import Joi from "joi";
import jwt from 'jsonwebtoken'
import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcrypt';
import path from 'path'
import dotenv from "dotenv";
import crypto from 'crypto'
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import hbs from "nodemailer-express-handlebars";
import localStorage from 'localStorage'
import { randomStringAsBase64Url } from "../utils/helper.js";
import { getLocation } from "../utils/getLocation.js";
dotenv.config();
const prisma = new PrismaClient();
const baseurl = process.env.BASE_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var transporter = nodemailer.createTransport({
  // service: 'gmail',
  host: "smtp.gmail.com",
  port: 587,
  // secure: true,
  auth: {
    user: "testing26614@gmail.com",
    pass: "ibxakoguozdwqtav",
  },
});

const handlebarOptions = {
  viewEngine: {
    partialsDir: path.resolve(__dirname, "../view/"),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, "../view/"),
};

transporter.use("compile", hbs(handlebarOptions));
export async function signup(req, res) {
  try {
    console.log("here");

    const { email, password, full_name } = req.body;
    console.log(req.body);
    console.log("after")
    const schema = Joi.alternatives(Joi.object({
      email: Joi.string().min(5).max(255).email({ tlds: { allow: false } }).lowercase().required(),
      password: Joi.string().min(8).max(15).required(),
      full_name: Joi.string().max(255).required()

    }))
    const result = schema.validate(req.body);
    if (result.error) {
      const message = result.error.details.map((i) => i.message).join(",");
      return res.json({
        message: result.error.details[0].message,
        error: message,
        missingParams: result.error.details[0].message,
        status: 400,
        success: false,
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email
      }
    })
    if (user) {
      return res.json({
        success: false,
        message: "Already have account, Please Login",
        status: 400,
      });
    }
    const act_token = crypto.randomBytes(16).toString('hex');
    let mailOptions = {
      from: 'stuffyclub1@gmail.com',
      to: email,
      subject: 'Activate Account',
      template: 'signupemail',
      context: {
        // href_url: `http://192.168.1.35:3000verifyUser/` + `${act_token}`,
        href_url: `${baseurl}/user/verifyUser/${act_token}`,
        image_logo: `${baseurl}/image/logo.png`,
        msg: `Please click below link to activate your account.`

      }
    };
    transporter.sendMail(mailOptions, async function (error, info) {
      if (error) {
        return res.json({
          success: false,
          status: 400,
          message: 'Mail Not delivered'
        });
      }
      else {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword)
        // Save the user with the hashed password using Prisma
        await prisma.user.create({
          data: {
            email: email,
            password: hashedPassword,
            full_name: full_name,
            act_token: act_token,
          }
        })
        console.log('account created')

        return res.status(200).json({
          success: true,
          message: "Email verification required. Check your inbox for a confirmation link",
          status: 200,
        });
      }
    });

  } catch (error) {
    return res.json({
      success: false,
      message: "Internal server error",
      status: 500,
      error: error,
    });
  }

}
export async function verifyUserEmail(req, res) {
  try {
    const act_token = req.params.id;
    // const token = generateToken();
    if (!act_token) {
      const message = result.error.details.map((i) => i.message).join(",");
      return res.json({
        message: result.error.details[0].message,
        error: message,
        missingParams: result.error.details[0].message,
        status: 400,
        success: false,
      });
    }
    else {
      console.log("act_token", act_token);
      const user = await prisma.user.findFirst({
        where: {
          act_token: act_token
        }
      })
      if (user) {
        const updateUser = await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            isVerified: true
          }
        })
        if (updateUser) {
          res.sendFile(path.join(__dirname, '../view/verify.html'));
        }
        else {
          res.sendFile(path.join(__dirname, '../view/notverify.html'));
        }
      }
      else {
        res.sendFile(__dirname + '/view/notverify.html');
      }
    }
  }
  catch (error) {
    console.log(error);
    res.send(`<div class="container">
      <p>404 Error, Page Not Found</p>
      </div> `);
  }
};
export async function login(req, res) {
  try {
    const secretKey = process.env.SECRET_KEY;
    const { email, password, fcm_token, lat, lng } = req.body;
    // const token = generateToken();
    const schema = Joi.alternatives(
      Joi.object({
        //email: Joi.string().min(5).max(255).email({ tlds: { allow: false } }).lowercase().required(),
        email: Joi.string().min(5).max(255).email({ tlds: { allow: false } }).lowercase().required(),
        password: Joi.string().min(8).max(15).required().messages({
          "any.required": "{{#label}} is required!!",
          "string.empty": "can't be empty!!",
          "string.min": "minimum 8 value required",
          "string.max": "maximum 15 values allowed",
        }),
        fcm_token: Joi.string().optional(),
        lat: Joi.string().optional(),
        lng: Joi.string().optional(),
      })
    );
    const result = schema.validate({ email, password });

    if (result.error) {
      const message = result.error.details.map((i) => i.message).join(",");
      return res.json({
        message: result.error.details[0].message,
        error: message,
        missingParams: result.error.details[0].message,
        status: 400,
        success: false,
      });
    } else {
      const user = await prisma.user.findUnique({
        where: {
          email: email
        }
      })
      if (!user || !(await bcrypt.compare(password, user.password))) {

        return res.status(400).json({
          success: false,
          message: "Invalid login credentials",
          status: 400,
        });
      }
      if (user.isVerified === false) {
        return res.status(400).json({
          message: "Please verify your account",
          status: 400,
          success: false
        })
      }
      if (fcm_token) {
        await prisma.user.update({
          where: {
            email: email
          },
          data: {
            fcm_token: fcm_token
          }
        })
      }
      const userDetails = await prisma.user.findUnique({
        where: {
          email: email
        },
        select: {
          id: true,
          email: true,
          fcm_token: true,
          avatar_url: true,
          cover_photo_url: true,
          bio: true,
          handle: true,
          full_name: true,
          numberOfFollower: true,
          numberOfFollowing: true,
          country: true,
          city: true
        }
      });
      const { city, country } = await getLocation(lat, lng);
      console.log(city, country);
      await prisma.user.update({
        where: {
          id: userDetails.id
        },
        data: {
          city: city,
          country: country
        }
      })
      const userData = await prisma.user.findUnique({
        where: {
          email: email
        },
        select: {
          id: true,
          email: true,
          fcm_token: true,
          avatar_url: true,
          cover_photo_url: true,
          bio: true,
          handle: true,
          full_name: true,
          numberOfFollower: true,
          numberOfFollowing: true,
          country: true,
          city: true
        }
      });
      const userSetting = await prisma.userSetting.findFirst({
        where: {
          userId: userDetails.id
        }
      });
      if (userSetting === null) {
        await prisma.userSetting.create({
          data: {
            userId: userDetails.id
          }
        })
      }
      const token = jwt.sign({ userId: user.id, email: user.email }, secretKey, { expiresIn: '3d' });
      return res.json({
        status: 200,
        success: true,
        message: "Login successful!",
        token: token,
        user: userData,
      });
    }
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "An internal server error occurred. Please try again later.",
      status: 500,
      error: error,
    });
  }
}
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const schema = Joi.alternatives(
      Joi.object({
        email: Joi.string().min(5).max(255).email({ tlds: { allow: false } }).lowercase().required(),
      })
    );
    const result = schema.validate({ email });
    if (result.error) {
      const message = result.error.details.map((i) => i.message).join(",");
      return res.json({
        message: result.error.details[0].message,
        error: message,
        missingParams: result.error.details[0].message,
        status: 400,
        success: false,
      });
    } else {
      const user = await prisma.user.findUnique({
        where: {
          email: email,
        }
      })
      if (user) {
        const genToken = randomStringAsBase64Url(20);
        await prisma.user.update({
          where: {
            email: email
          },
          data: {
            token: genToken
          }
        })

        const userToken = (await prisma.user.findUnique({
          where: {
            email: email,
          },
          select: {
            token: true,
          }
        })).token;

        let mailOptions = {
          from: "yashrajmandloi0511@gmail.com",
          to: email,
          subject: "Forget Password",
          template: "forget_template",
          context: {
            image_logo: `${baseurl}/images/logo.png`,
            href_url: `${baseurl}/user/verifyPassword/${userToken}`,
            msg: `Please click below link to change password.`,
          },
        };
        transporter.sendMail(mailOptions, async function (error, info) {
          if (error) {
            return res.json({
              success: false,
              message: error,
            });
          } else {
            return res.json({
              success: true,
              message:
                "Password reset link sent successfully. Please check your email ",
            });
          }
        });
      } else {
        return res.json({
          success: false,
          message: "Email address not found. Please enter a valid email",
          status: 400,
        });
      }
    }
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Internal server error",
      status: 500,
      error: error,
    });
  }
};
export async function verifyPassword(req, res) {
  try {
    const id = req.params.token;

    console.log(id)

    if (!id) {
      return res.status(400).send("Invalid link");
    }
    else {
      const user = await prisma.user.findFirst({
        where: {
          token: id
        }
      })
      const token = user.token;
      if (token) {
        localStorage.setItem('vertoken', JSON.stringify(token));
        res.render(path.join(__dirname, '../view/', 'forgetPassword.ejs'), { msg: "" });
      }
      else {
        res.render(path.join(__dirname, '../view/', 'forgetPassword.ejs'), { msg: "This User is not Registered" });

      }
    }
  }
  catch (err) {
    console.log(err);
    res.send(`<div class="container">
        <p>404 Error, Page Not Found</p>
        </div> `);
  }
};
export async function changePassword(req, res) {
  try {
    const { password, confirm_password } = req.body;
    const token = JSON.parse(localStorage.getItem('vertoken'));
    const schema = Joi.alternatives(
      Joi.object({
        password: Joi.string().min(8).max(10).required().messages({
          "any.required": "{{#label}} is required!!",
          "string.empty": "can't be empty!!",
          "string.min": "minimum 8 value required",
          "string.max": "maximum 10 values allowed",
        }),
        confirm_password: Joi.string().min(8).max(10).required().messages({
          "any.required": "{{#label}} is required!!",
          "string.empty": "can't be empty!!",
          "string.min": "minimum 8 value required",
          "string.max": "maximum 10 values allowed",
        }),
      })
    )
    const result = schema.validate({ password, confirm_password });
    if (result.error) {
      const message = result.error.details.map((i) => i.message).join(",");
      res.render(path.join(__dirname, '../view/', 'forgetPassword.ejs'), {
        message: result.error.details[0].message,
        error: message,
        missingParams: result.error.details[0].message,
        msg: message
      });

    }
    else {
      if (password == confirm_password) {
        const user = await prisma.user.findFirst({
          where: {
            token: token
          }
        });
        if (user) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: {
              id: user.id
            },
            data: {
              password: hashedPassword
            }
          })
          // console.log("result2",result2)
          res.sendFile(path.join(__dirname, '../view/message.html'), { msg: "" });
          // else {
          //   res.render(path.join(__dirname ,'../view/', 'forgetPassword.ejs'), { msg: "Internal Error Occured, Please contact Support." });
          // }
        }
        else {
          return res.json({
            message: "User not found please register your account",
            success: false,
            status: 400,
          })
        }
      }
      else {
        res.render(path.join(__dirname, '../view/', 'forgetPassword.ejs'),
          { msg: "Password and Confirm Password do not match" });
      }
    }
  }
  catch (error) {
    console.log(error);

    res.render(path.join(__dirname, '/view/', 'forgetPassword.ejs'),
      { msg: "Internal server error" })
    // return res.json({
    //     success: false,
    //     message: "Internal server error",
    //     status: 500
    // })
  }
};
export async function editProfile(req, res) {
  try {
    const { full_name, bio, handle } = req.body;
    const token = JSON.parse(localStorage.getItem('vertoken'));
    const schema = Joi.alternatives(
      Joi.object({
        full_name: Joi.string().optional(),
        bio: Joi.string().optional(),
        handle: Joi.string().optional(),
      })
    )
    const result = schema.validate(req.body);
    if (result.error) {
      const message = result.error.details.map((i) => i.message).join(",");
      return res.json({
        message: result.error.details[0].message,
        error: message,
        missingParams: result.error.details[0].message,
        status: 400,
        success: false,
      });
    }
    else {
      // console.log("email", req.body)
      // const user = await prisma.user.findUnique({
      //   where: {
      //     id: {
      //       not: req.user.id
      //     },
      //     email: email,
      //   }
      // })
      // console.log(user)
      // if (user) {
      //   return res.json({
      //     success: false,
      //     message: "User with this email already exits ,please user different email",
      //     status: 400,
      //   });
      // }
      console.log(req.user.id, "userId")
      const userWithHandleExists = await prisma.user.findUnique({
        where: {
          NOT: {
            id: req.user.id
          },
          handle: handle,
        }
      });

      if (userWithHandleExists) {
        return res.status(400).json({
          success: false,
          message: "User name already exists ,try different User Name",
          status: 500,
        })
      }
      let userData = {
        // email: email ? email : req.user.email,
        full_name: full_name ? full_name : req.user.full_name,
        bio: bio ? bio : req.user.bio,
        handle: handle ? handle : req.user.handle,
      };
      if (req.files && req.files['avatar'] && req.files['avatar'][0]) {
        userData.avatar_url = `${req.files['avatar'][0].filename}`;
      } else {
        userData.avatar_url = req.user.avatar_url;
      }
      if (req.files && req.files['cover'] && req.files['cover'][0]) {
        userData.cover_photo_url = `${req.files['cover'][0].filename}`;
      } else {
        userData.cover_photo_url = req.user.cover_photo_url;
      }
      await prisma.user.update({
        where: {
          id: req.user.id,
        },
        data: userData
      })
      const updatedUser = await prisma.user.findUnique({
        where: {
          id: req.user.id
        },
      })
      return res.status(200).json({
        success: true,
        message: "User Updated Successfully",
        status: 200,
        user: updatedUser
      })
    }
  }
  catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Internal server error",
      status: 500,
      error: error
    })
  }
};

export async function blockUser(req, res) {
  try {
    const { id } = req.params;

    await prisma.userBlocked.create({
      data: {
        userId: req.user.id,
        userBlockedId: parseInt(id)
      }
    })
    return res.status(200).json({
      success: true,
      message: "User Blocked Successfully",
      status: 200,
    })

  } catch (error) {
    return res.json({
      success: false,
      message: "Internal server error",
      status: 500,
      error: error,
    });
  }

}
export async function getAllUsers(req, res) {

  try {
    const { search, page = 1, limit = 10 } = req.query;
    const blockedUserIDs = (await prisma.userBlocked.findMany({
      where: {
        userId: req.user.id
      },
      select: {
        userBlockedId: true,
      }
    })).map((user) => user.userBlockedId);

    const users = await prisma.user.findMany({
      where: {
        id: {
          notIn: [...blockedUserIDs, req.user.id]
        },
        full_name: {
          contains: search
        }
      }, select: {
        id: true,
        full_name: true,
        avatar_url: true,
        handle: true
      }, skip: parseInt((page - 1) * limit), take: parseInt(limit),
    });

    await Promise.all(users.map((user) => {
      if (user.avatar_url) {
        user.avatar_url = `${baseurl}/images/${user.avatar_url}`
      }
    }))

    return res.status(200).json({
      success: true,
      message: "users",
      users: users,
      status: 200,
    })
  } catch ({ error }) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      status: 500,
      error: error,
    });
  }




}
export async function follow(req, res) {
  const userToFollowId = parseInt(req.params.id);
  const userId = req.user.id;
  try {
    // Check if both users exist
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userToFollow = await prisma.user.findUnique({ where: { id: userToFollowId } });

    if (!user || !userToFollow) {
      return res.status(404).json({
        success: false,
        status: 400,
        message: 'User or user to follow not found'
      });
    }

    // Check if the follow relationship already exists
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId: userId,
        followingId: userToFollowId,
      },
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Already following this user',
      });
    }

    // Create the follow relationship
    await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: userToFollowId,
      },
    });
    let numberOfFollower = (await prisma.user.findUnique({
      where: {
        id: userToFollowId
      }
    })).numberOfFollower
    numberOfFollower = numberOfFollower + 1;
    await prisma.user.update({
      where: {
        id: userToFollowId,
      },
      data: {
        numberOfFollower: numberOfFollower
      }
    })
    let numberOfFollowing = (await prisma.user.findUnique({
      where: {
        id: userId
      }
    })).numberOfFollowing
    numberOfFollowing = numberOfFollowing + 1;

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        numberOfFollowing: numberOfFollowing
      }
    })


    return res.status(200).json({ success: true, status: 200, message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, status: 500, message: 'Internal server error', error: error });
  }
};
export async function unFollow(req, res) {
  const userToUnfollowId = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    // Check if both users exist
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userToUnfollow = await prisma.user.findUnique({ where: { id: userToUnfollowId } });

    if (!user || !userToUnfollow) {
      return res.status(404).json({ success: false, status: 404, message: 'User or user to unfollow not found' });
    }

    // Check if the follow relationship exists
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId: userId,
        followingId: userToUnfollowId,
      },
    });

    if (!existingFollow) {
      return res.status(400).json({ success: false, status: 400, message: 'Not following this user' });
    }

    // Delete the follow relationship
    await prisma.follow.delete({
      where: {
        id: existingFollow.id,
      },
    });
    if (user.numberOfFollowing > 0) {
      const numberOfFollowing = user.numberOfFollowing - 1;
      await prisma.user.update({
        where: {
          id: userId
        },
        data: {
          numberOfFollowing: numberOfFollowing
        }
      })
    }
    if (userToUnfollow.numberOfFollower > 0) {
      const numberOfFollower = userToUnfollow.numberOfFollower - 1;
      await prisma.user.update({
        where: {
          id: userToUnfollowId
        },
        data: {
          numberOfFollower: numberOfFollower
        }
      })
    }
    return res.status(200).json({ success: true, status: 200, message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, status: 500, message: 'Internal server error', error: error });
  }
};
export async function getMyFollowers(req, res) {
  try {
    const userId = parseInt(req.user.id);
    const blockedUserIDs = (await prisma.userBlocked.findMany({
      where: {
        userId: req.user.id
      },
      select: {
        userBlockedId: true,
      }
    })).map((user) => user.userBlockedId);
    const followers = (await prisma.follow.findMany({
      where: {
        followingId: userId,
        followerId: {
          notIn: blockedUserIDs
        }
      },
      select: {
        follower: true
      }
    })).map((follow) => {
      return follow.follower;
    })
    const userIFollowIds = (await prisma.follow.findMany({
      where: {
        followerId: req.user.id
      }
    })).map(({ followingId }) => followingId);
    await Promise.all(followers.map((user) => {
      user.isFollowed = userIFollowIds.includes(user.id);
      if (user.avatar_url) {
        user.avatar_url = `${baseurl}/images/${user.avatar_url}`
      }
      if (user.cover_photo_url) {
        user.cover_photo_url = `${baseurl}/images/${user.cover_photo_url}`
      }
      return user
    }))
    return res.status(200).json({
      success: true,
      status: 200,
      followers: followers,
      total: followers.length
    })
  } catch (error) {
    return res.status(500).json({ success: false, status: 500, message: 'Internal server error', error: error });
  }

}
export async function getUserWhomIFollow(req, res) {
  try {
    const userId = parseInt(req.user.id);
    const blockedUserIDs = (await prisma.userBlocked.findMany({
      where: {
        userId: req.user.id
      },
      select: {
        userBlockedId: true,
      }
    })).map((user) => user.userBlockedId);
    const followings = (await prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: {
          notIn: blockedUserIDs
        }
      },
      select: {
        following: true
      }
    })).map((follow) => {
      return follow.following;
    })
    await Promise.all(followings.map((user) => {
      if (user.avatar_url) {
        user.avatar_url = `${baseurl}/images/${user.avatar_url}`
      }
      if (user.cover_photo_url) {
        user.cover_photo_url = `${baseurl}/images/${user.cover_photo_url}`
      }
    }))
    return res.status(200).json({
      success: true,
      status: 200,
      followings: followings,
      total: followings.length
    })
  } catch (error) {
    return res.status(500).json({ success: false, status: 500, message: 'Internal server error', error: error });
  }

}

export async function saveOrUnSaveProfile(req, res) {
  try {
    let { userId } = req.params;

    userId = parseInt(userId);

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'user Not Found',
      })
    }
    const saveUser = await prisma.saveUser.findFirst({
      where: {
        userId: userId,
        saveByUserId: req.user.id
      }
    })

    if (saveUser) {

      await prisma.saveUser.delete({
        where: {
          id: saveUser.id,
          saveByUserId: req.user.id,
          userId: userId
        }
      })
      if (user.numberOfSaves > 0) {
        await prisma.user.update({
          where: {
            id: userId
          },
          data: {
            numberOfSaves: user.numberOfSaves - 1,
          }
        })
      }

      return res.status(200).json({
        status: 200,
        message: 'UnSaved the user',
        success: true
      })
    }
    else {

      const saveUser = await prisma.saveUser.create({
        data: {
          userId: userId,
          saveByUserId: req.user.id
        }
      })
      await prisma.user.update({
        where: {
          id: userId
        },
        data: {
          numberOfSaves: user.numberOfSaves + 1,
        }
      })
      return res.status(200).json({
        status: 200,
        message: 'Saved the user',
        success: true,
        saveUser: saveUser
      })

    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 200,
      message: 'Internal Server Error',
      success: false,
      error: error
    })
  }
}

export async function getMySavedUsers(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userIFollowIds = (await prisma.follow.findMany({
      where: {
        followerId: req.user.id
      }
    })).map(({ followingId }) => followingId);

    const blockedUserIDs = (await prisma.userBlocked.findMany({
      where: {
        userId: req.user.id
      },
      select: {
        userBlockedId: true,
      }
    })).map((user) => user.userBlockedId);
    const mySavedUsers = await prisma.saveUser.findMany({
      where: {
        saveByUserId: req.user.id,
        userId: {
          notIn: blockedUserIDs
        }
      }, include: {
        user: true
      }, orderBy: {
        createdAt: 'desc'
      }, skip: parseInt((page - 1) * limit), take: parseInt(limit)
    })
    await Promise.all(mySavedUsers.map((data) => {
      data.user.isFollowed = userIFollowIds.includes(data.user.id);
      if (data.user.avatar_url) {
        data.user.avatar_url = `${baseurl}/images/${data.user.avatar_url}`
      }
      if (data.user.cover_photo_url) {
        data.user.cover_photo_url = `${baseurl}/images/${data.user.cover_photo_url}`
      }
      return data
    }))
    return res.status(200).json({
      status: 200,
      message: 'My Saved Users',
      success: true,
      mySavedUsers: mySavedUsers
    })


  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 200,
      message: 'Internal Server Error',
      success: false,
      error: error
    })
  }

}
export async function getMyBlockedUser(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;

    // const blockedUserIDs = (await prisma.userBlocked.findMany({
    //   where: {
    //     userId: req.user.id
    //   },
    //   select: {
    //     userBlockedId: true,
    //   }, orderBy: {
    //     createdAt: 'desc'
    //   }, skip: parseInt((page - 1) * limit), take: parseInt(limit),
    // })).map((user) => user.userBlockedId);


    const total = await prisma.userBlocked.count({
      where: {
        userId: req.user.id
      }
    })
    const myBlockedUserList = await prisma.userBlocked.findMany({
      where: {
        userId: req.user.id
      },
      select: {
        userBlocked: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    await Promise.all(myBlockedUserList.map((data) => {
      if (data.userBlocked.avatar_url) {
        data.userBlocked.avatar_url = `${baseurl}/images/${data.userBlocked.avatar_url}`
      }
      if (data.userBlocked.cover_photo_url) {
        data.userBlocked.cover_photo_url = `${baseurl}/images/${data.userBlocked.cover_photo_url}`
      }
    }))

    return res.status(200).json({
      status: 200,
      message: 'BLocked Users',
      total: total,
      success: true,
      myBlockedUserList: myBlockedUserList.map(({ userBlocked }) => userBlocked)
    })


  } catch (error) {

    console.log(error);
    return res.status(500).json({
      status: 200,
      message: 'Internal Server Error',
      success: false,
      error: error
    })
  }

}
export async function deleteAccount(req, res) {
  try {
    const deleteAccount = await prisma.user.delete({
      where: {
        id: req.user.id
      }
    });

    return res.status(200).json({
      status: 200,
      message: 'Account deleted Successfully',
      success: true,
      deleteAccount: deleteAccount
    })

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 200,
      message: 'Internal Server Error',
      success: false,
      error: error
    })
  }
}
export async function getUser(req, res) {
  try {
    const { userId } = req.params;
    const blockedUserIDs = (await prisma.userBlocked.findMany({
      where: {
        userId: req.user.id
      },
      select: {
        userBlockedId: true,
      }
    })).map((user) => user.userBlockedId);
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(userId)
      },
      include: {
        posts: true,
        vlogs: true,
        blogs: true
      }
    });
    const numberOfFollower = await prisma.follow.count({
      where: {
        followingId: parseInt(userId)
      }
    })
    user.numberOfFollower = numberOfFollower
    const numberOfFollowings = await prisma.follow.count({
      where: {
        followerId: parseInt(userId)
      }
    })
    user.numberOfFollowing = numberOfFollowings
    user.posts.map((post) => {
      if (post.image_url) {
        post.image_url = `${baseurl}/post/${post.image_url}`
      }
    });
    user.numberOfPosts = user.posts.length
    user.blogs.map((blog) => {
      if (blog.image_url) {
        blog.image_url = `${baseurl}/blog/${blog.image_url}`
      }
    });
    const isFollowed = await prisma.follow.findFirst({
      where: {
        followerId: req.user.id,
        followingId: user.id
      }
    })
    if (isFollowed) {
      user.alreadyFollowed = true
    }
    else {
      user.isFollowed = false
    }
    for (const vlog of user.vlogs) {
      const isLiked = await prisma.reactVlog.findFirst({
        where: {
          vlogId: vlog.id,
          createByUserId: req.user.id
        }
      });
      const isSaved = await prisma.saveVlog.findFirst({
        where: {
          vlogId: vlog.id,
          saveByUserId: req.user.id
        }
      })
      const numberOfViews = await prisma.viewVlog.count({
        where: {
          vlogId: vlog.id,
          viewByUserId: {
            notIn: blockedUserIDs
          }
        }
      })
      vlog.numberOfViews = numberOfViews;
      if (isLiked) {
        vlog.alreadyLiked = true;
      } else {
        vlog.alreadyLiked = false;
      }
      if (isSaved) {
        vlog.alreadySaved = true;
      }
      else {
        vlog.alreadySaved = false;
      }
      if (vlog.video_url) {
        vlog.video_url = `${baseurl}/vlog/${vlog.video_url}`
      }
      if (vlog.thumbnail_url) {
        vlog.thumbnail_url = `${baseurl}/thumbnails/${vlog.thumbnail_url}`
      }
    }
    if (user.avatar_url) {
      user.avatar_url = `${baseurl}/images/${user.avatar_url}`
    }
    if (user.cover_photo_url) {
      user.cover_photo_url = `${baseurl}/images/${user.cover_photo_url}`
    }
    return res.status(200).json({
      status: 200,
      message: ' User Data',
      success: true,
      user: user
    })


  } catch (error) {

    console.log(error);
    return res.status(500).json({
      status: 200,
      message: 'Internal Server Error',
      success: false,
      error: error
    })
  }

}
export async function getMyProfile(req, res) {
  try {
    const blockedUserIDs = (await prisma.userBlocked.findMany({
      where: {
        userId: req.user.id
      },
      select: {
        userBlockedId: true,
      }
    })).map((user) => user.userBlockedId);
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id
      },
      include: {
        posts: true,
        vlogs: true,
        blogs: true
      }
    });
    const numberOfFollower = await prisma.follow.count({
      where: {
        followingId: req.user.id
      }
    })
    user.numberOfFollower = numberOfFollower
    const numberOfFollowings = await prisma.follow.count({
      where: {
        followerId: req.user.id
      }
    })
    user.numberOfFollowing = numberOfFollowings
    user.posts.map((post) => {
      if(post.image_url){
        post.image_url = `${baseurl}/post/${post.image_url}`
      }
    });
    user.numberOfPosts = user.posts.length
    user.blogs.map((blog) => {
      if (blog.image_url) {
        blog.image_url = `${baseurl}/blog/${blog.image_url}`
      }
    });
    for (const vlog of user.vlogs) {
      const isLiked = await prisma.reactVlog.findFirst({
        where: {
          vlogId: vlog.id,
          createByUserId: req.user.id
        }
      });
      const isSaved = await prisma.saveVlog.findFirst({
        where: {
          vlogId: vlog.id,
          saveByUserId: req.user.id
        }
      })
      const numberOfViews = await prisma.viewVlog.count({
        where: {
          vlogId: vlog.id,
          viewByUserId: {
            notIn: blockedUserIDs
          }
        }
      })
      vlog.numberOfViews = numberOfViews;

      if (vlog.video_url) {
        vlog.video_url = `${baseurl}/vlog/${vlog.video_url}`
      }
      if (vlog.thumbnail_url) {
        vlog.thumbnail_url = `${baseurl}/thumbnails/${vlog.thumbnail_url}`
      }
      if (isLiked) {
        vlog.alreadyLiked = true;
      } else {
        vlog.alreadyLiked = false;
      }
      if (isSaved) {
        vlog.alreadySaved = true;
      }
      else {
        vlog.alreadySaved = false;
      }
    }

    if (user.avatar_url) {
      user.avatar_url = `${baseurl}/images/${user.avatar_url}`
    }
    if (user.cover_photo_url) {
      user.cover_photo_url = `${baseurl}/images/${user.cover_photo_url}`
    }
    return res.status(200).json({
      status: 200,
      message: ' User Data',
      success: true,
      user: user
    })


  } catch (error) {

    console.log(error);
    return res.status(500).json({
      status: 200,
      message: 'Internal Server Error',
      success: false,
      error: error
    })
  }

}
export async function getMySettings(req, res) {
  try {
    const userSetting = await prisma.userSetting.findFirst({
      where: {
        userId: req.user.id
      }
    });
    return res.status(200).json({
      status: 200,
      message: ' User Settings',
      success: true,
      userSetting: userSetting
    })


  } catch (error) {

    console.log(error);
    return res.status(500).json({
      status: 200,
      message: 'Internal Server Error',
      success: false,
      error: error
    })
  }

}

export async function updateMySettings(req, res) {
  try {
    const { lastSeen, commentsAllowed, chatNotification, feedNotification } = req.body;

    const schema = Joi.alternatives(Joi.object({
      lastSeen: Joi.boolean().optional(),
      commentsAllowed: Joi.boolean().optional(),
      chatNotification: Joi.boolean().optional(),
      feedNotification: Joi.boolean().optional()
    }))
    const result = schema.validate(req.body);
    if (result.error) {
      const message = result.error.details.map((i) => i.message).join(",");
      return res.json({
        message: result.error.details[0].message,
        error: message,
        missingParams: result.error.details[0].message,
        status: 400,
        success: false,
      });
    }

    var regexPattern = new RegExp("true");

    const user = await prisma.userSetting.findFirst({
      where: {
        userId: req.user.id
      }
    })
    console.log(typeof lastSeen)
    console.log(regexPattern.test(lastSeen))
    const userSetting = await prisma.userSetting.update({
      where: {
        id: user.id
      },
      data: {
        lastSeen: lastSeen != null ? lastSeen : true,
        feedNotification: feedNotification != null ? feedNotification : true,
        commentsAllowed: commentsAllowed != null ? commentsAllowed : true,
        chatNotification: chatNotification != null ? chatNotification : true,

      }
    });
    return res.status(200).json({
      status: 200,
      message: ' User Settings',
      success: true,
      userSetting: userSetting
    })


  } catch (error) {

    console.log(error);
    return res.status(500).json({
      status: 200,
      message: 'Internal Server Error',
      success: false,
      error: error
    })
  }

}