/*
  Warnings:

  - A unique constraint covering the columns `[handle]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `avatar_url` VARCHAR(191) NULL,
    ADD COLUMN `bio` VARCHAR(191) NULL,
    ADD COLUMN `cover_photo_url` VARCHAR(191) NULL,
    ADD COLUMN `fcm_token` VARCHAR(191) NULL,
    ADD COLUMN `handle` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_handle_key` ON `User`(`handle`);
