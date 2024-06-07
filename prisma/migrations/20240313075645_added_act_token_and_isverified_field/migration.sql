-- AlterTable
ALTER TABLE `user` ADD COLUMN `act_token` VARCHAR(191) NULL,
    ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false;
