-- AddForeignKey
ALTER TABLE `UserBlocked` ADD CONSTRAINT `UserBlocked_userBlockedId_fkey` FOREIGN KEY (`userBlockedId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
