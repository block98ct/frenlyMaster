-- AlterTable
ALTER TABLE `follow` ADD COLUMN `numberOfFollower` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `numberOfFollowing` INTEGER NOT NULL DEFAULT 0;
