/*
  Warnings:

  - You are about to drop the column `numberOfFollower` on the `follow` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfFollowing` on the `follow` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `follow` DROP COLUMN `numberOfFollower`,
    DROP COLUMN `numberOfFollowing`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `numberOfFollower` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `numberOfFollowing` INTEGER NOT NULL DEFAULT 0;
