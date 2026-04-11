// ============================================================
// ATTACHMENT / FILE UPLOAD CONTROLLER
// ============================================================
const prisma = require('../utils/prisma');
const path = require('path');
const fs = require('fs').promises;

/**
 * 📸 Upload attachment (single or multiple)
 * POST /api/attachments/upload
 */
exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        code: 'NO_FILES_PROVIDED',
        message: 'No files provided'
      });
    }

    const { entityType, entityId, quoteId, jobCardId, testCertId, attachmentType } = req.body;
    const userId = req.user.id;

    const attachments = [];

    // Create attachment records for each file
    for (const file of req.files) {
      const attachment = await prisma.attachment.create({
        data: {
          fileName: file.originalname,
          fileSize: file.size,
          filePath: file.path,
          mimeType: file.mimetype,
          attachmentType: attachmentType || 'PHOTO',
          description: req.body.description || null,
          
          // Link to specific entity
          ...(quoteId && { quoteId: parseInt(quoteId) }),
          ...(jobCardId && { jobCardId: parseInt(jobCardId) }),
          ...(testCertId && { testCertId: parseInt(testCertId) }),
          ...(entityType && entityId && {
            entityType,
            entityId: parseInt(entityId)
          }),
          
          uploadedById: userId,
          isPublic: req.body.isPublic === 'true' || false
        },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } }
        }
      });

      attachments.push(attachment);
    }

    res.status(201).json({
      success: true,
      code: 'ATTACHMENTS_UPLOADED',
      message: `${attachments.length} file(s) uploaded successfully`,
      data: attachments
    });
  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({
      code: 'UPLOAD_FAILED',
      message: error.message
    });
  }
};

/**
 * 📸 Get attachments for entity
 * GET /api/attachments?entityType=JobCard&entityId=5
 */
exports.getAttachments = async (req, res) => {
  try {
    const { entityType, entityId, quoteId, jobCardId, testCertId, page = 1, limit = 20 } = req.query;

    const where = {};
    
    if (quoteId) where.quoteId = parseInt(quoteId);
    if (jobCardId) where.jobCardId = parseInt(jobCardId);
    if (testCertId) where.testCertId = parseInt(testCertId);
    if (entityType && entityId) {
      where.entityType = entityType;
      where.entityId = parseInt(entityId);
    }

    where.isArchived = false;

    const attachments = await prisma.attachment.findMany({
      where,
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { uploadedAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.attachment.count({ where });

    res.status(200).json({
      success: true,
      data: attachments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({
      code: 'FETCH_FAILED',
      message: error.message
    });
  }
};

/**
 * 📸 Get single attachment details
 * GET /api/attachments/:id
 */
exports.getAttachmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: parseInt(id) },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } }
      }
    });

    if (!attachment) {
      return res.status(404).json({
        code: 'ATTACHMENT_NOT_FOUND',
        message: 'Attachment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: attachment
    });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    res.status(500).json({
      code: 'FETCH_FAILED',
      message: error.message
    });
  }
};

/**
 * 📸 Download attachment file
 * GET /api/attachments/:id/download
 */
exports.downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!attachment) {
      return res.status(404).json({
        code: 'ATTACHMENT_NOT_FOUND',
        message: 'Attachment not found'
      });
    }

    // Authorization: public attachments are downloadable; private require owner or manager/admin
    const isPrivileged = ['ADMIN', 'MANAGER'].includes(req.user?.role);
    if (!attachment.isPublic && !isPrivileged && attachment.uploadedById !== req.user?.id) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You are not allowed to download this attachment'
      });
    }

    const uploadsRoot = path.resolve(__dirname, '../../uploads');
    const filePath = path.resolve(attachment.filePath);
    if (!filePath.startsWith(uploadsRoot)) {
      return res.status(400).json({
        code: 'INVALID_FILE_PATH',
        message: 'Invalid attachment file path'
      });
    }
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        code: 'FILE_NOT_FOUND',
        message: 'File does not exist'
      });
    }

    res.download(filePath, attachment.fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({
          code: 'DOWNLOAD_FAILED',
          message: 'Failed to download file'
        });
      }
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      code: 'DOWNLOAD_FAILED',
      message: error.message
    });
  }
};

/**
 * 📸 Update attachment metadata
 * PATCH /api/attachments/:id
 */
exports.updateAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, isPublic, isArchived } = req.body;

    const existing = await prisma.attachment.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found' });
    }
    const isPrivileged = ['ADMIN', 'MANAGER'].includes(req.user?.role);
    if (!isPrivileged && existing.uploadedById !== req.user?.id) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'You are not allowed to update this attachment' });
    }

    const attachment = await prisma.attachment.update({
      where: { id: parseInt(id) },
      data: {
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        ...(isArchived !== undefined && { isArchived })
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(200).json({
      success: true,
      code: 'ATTACHMENT_UPDATED',
      message: 'Attachment updated successfully',
      data: attachment
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        code: 'ATTACHMENT_NOT_FOUND',
        message: 'Attachment not found'
      });
    }
    console.error('Error updating attachment:', error);
    res.status(500).json({
      code: 'UPDATE_FAILED',
      message: error.message
    });
  }
};

/**
 * 📸 Delete attachment
 * DELETE /api/attachments/:id
 */
exports.deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!attachment) {
      return res.status(404).json({
        code: 'ATTACHMENT_NOT_FOUND',
        message: 'Attachment not found'
      });
    }

    const isPrivileged = ['ADMIN', 'MANAGER'].includes(req.user?.role);
    if (!isPrivileged && attachment.uploadedById !== req.user?.id) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'You are not allowed to delete this attachment' });
    }

    // Delete file from storage (only within uploads root)
    try {
      const uploadsRoot = path.resolve(__dirname, '../../uploads');
      const filePath = path.resolve(attachment.filePath);
      if (filePath.startsWith(uploadsRoot)) {
      await fs.unlink(filePath);
      } else {
        console.warn('Warning: Refusing to delete file outside uploads root');
      }
    } catch (fileError) {
      console.warn('Warning: Could not delete physical file:', fileError.message);
      // Continue with database deletion even if file deletion fails
    }

    // Delete database record
    await prisma.attachment.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({
      success: true,
      code: 'ATTACHMENT_DELETED',
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      code: 'DELETE_FAILED',
      message: error.message
    });
  }
};

/**
 * 📸 Search attachments
 * GET /api/attachments/search?keyword=drawing&attachmentType=DRAWING
 */
exports.searchAttachments = async (req, res) => {
  try {
    const { keyword, attachmentType, page = 1, limit = 20 } = req.query;

    const where = {
      isArchived: false
    };

    if (keyword) {
      where.OR = [
        { fileName: { contains: keyword } },
        { description: { contains: keyword } }
      ];
    }

    if (attachmentType) {
      where.attachmentType = attachmentType;
    }

    const attachments = await prisma.attachment.findMany({
      where,
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { uploadedAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.attachment.count({ where });

    res.status(200).json({
      success: true,
      data: attachments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error searching attachments:', error);
    res.status(500).json({
      code: 'SEARCH_FAILED',
      message: error.message
    });
  }
};
