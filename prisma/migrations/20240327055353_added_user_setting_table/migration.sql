-- CreateTable
CREATE TABLE `UserSetting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lastSeen` BOOLEAN NOT NULL DEFAULT true,
    `userId` INTEGER NOT NULL,
    `commentsAllowed` BOOLEAN NOT NULL DEFAULT true,
    `chatNotification` BOOLEAN NOT NULL DEFAULT true,
    `feedNotification` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserSetting` ADD CONSTRAINT `UserSetting_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
