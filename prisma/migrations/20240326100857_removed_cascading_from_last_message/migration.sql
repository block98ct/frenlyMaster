-- DropForeignKey
ALTER TABLE `chat` DROP FOREIGN KEY `Chat_lastMessageId_fkey`;

-- AddForeignKey
ALTER TABLE `Chat` ADD CONSTRAINT `Chat_lastMessageId_fkey` FOREIGN KEY (`lastMessageId`) REFERENCES `ChatMessage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
