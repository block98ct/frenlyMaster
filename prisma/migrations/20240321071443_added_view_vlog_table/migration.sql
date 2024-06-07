-- AlterTable
ALTER TABLE `vlog` ADD COLUMN `numberOfViews` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `ViewVlog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vlogId` INTEGER NOT NULL,
    `viewByUserId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ViewVlog` ADD CONSTRAINT `ViewVlog_vlogId_fkey` FOREIGN KEY (`vlogId`) REFERENCES `Vlog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ViewVlog` ADD CONSTRAINT `ViewVlog_viewByUserId_fkey` FOREIGN KEY (`viewByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;