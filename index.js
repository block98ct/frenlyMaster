import express from "express";
import { userRouter } from "./routes/user.js";
import { blogRouter } from "./routes/blog.js";
import { vlogRouter } from "./routes/vlog.js";
import { postRouter } from "./routes/post.js";
import { homeRouter } from "./routes/home.js";
import { Server } from "socket.io";
import { createServer } from 'http'
import { initializeSocketIO } from "./utils/socket.js";
import cors from 'cors'
import { chatRouter } from "./routes/chat.js";
import { messageRouter } from "./routes/message.js";
import { notificationRouter } from "./routes/notification.js";
// dotenv.config();
// const port = process.env.PORT
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin:'http://localhost:3000',
    credentials: true,
  },
});
app.set("io", io);
app.use(
  cors({
    origin:
    'http://localhost:3000', // For multiple cors origin for production. Refer https://github.com/hiteshchoudhary/apihub/blob/a846abd7a0795054f48c7eb3e71f3af36478fa96/.env.sample#L12C1-L12C12
    credentials: true,
  })
);
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(express.static('public'));
app.use('/home', homeRouter);
app.use('/user', userRouter);
app.use('/blog', blogRouter);
app.use('/vlog', vlogRouter);
app.use('/post', postRouter);
app.use('/chat',chatRouter);
app.use('/message',messageRouter);
app.use('/notification',notificationRouter);


initializeSocketIO(io);


httpServer.listen(3001, () => {
  console.log("Node app is running on port 3001");
})


