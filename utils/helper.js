import crypto from 'crypto'
import base64url from 'base64url'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()
export function randomStringAsBase64Url(size) {
  return base64url(crypto.randomBytes(size));
}

export async function getBlogLikeStatus(createByUserId, blogIds) {
  const liked = await prisma.reactBlog.findMany({
    where: {
      createByUserId: createByUserId,
      blogId: {
        in: blogIds
      }
    }
  })
  const likedMap = liked.reduce((map, item) => ({ ...map, [item.blogId]: true }), {});
  return blogIds.map((id) => ({blogId: id, status: likedMap[id.toString()] || false}))
  
}


export async function getVlogLikeStatus(createByUserId, vlogIds) {
  const liked = await prisma.reactVlog.findMany({
    where: {
      createByUserId: createByUserId,
      vlogId: {
        in: vlogIds
      }
    }
  })
  const likedMap = liked.reduce((map, item) => ({ ...map, [item.vlogId]: true }), {});
  return vlogIds.map((id) => ({vlogId: id, status: likedMap[id.toString()] || false}))
  
}


export async function getBlogSaveStatus(saveByUserId, blogIds) {
  const liked = await prisma.saveBlog.findMany({
    where: {
      saveByUserId: saveByUserId,
      blogId: {
        in: blogIds
      }
    }
  })
  const likedMap = liked.reduce((map, item) => ({ ...map, [item.blogId]: true }), {});
 
  return blogIds.map((id) => ({blogId: id, status: likedMap[id.toString()] || false}))
  
}


export async function getVlogSaveStatus(saveByUserId, vlogIds) {
  const liked = await prisma.saveVlog.findMany({
    where: {
      saveByUserId: saveByUserId,
      vlogId: {
        in: vlogIds
      }
    }
  })
  const likedMap = liked.reduce((map, item) => ({ ...map, [item.vlogId]: true }), {});
 
  return vlogIds.map((id) => ({vlogId: id, status: likedMap[id.toString()] || false}))
  
}