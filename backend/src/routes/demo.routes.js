/**
 * SHEETAL DIES ERP - DEMO DATA & IMAGE ROUTES
 * Routes for accessing demo data, images, and sample business documents
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const DEMO_DATA_DIR = path.join(__dirname, '../../uploads/demo_data');

router.use(auth, requireRole('ADMIN'));

// ─────────────────────────────────────────────────────────────────────────
// GET /api/demo/images/catalog - Image Metadata Catalog
// ─────────────────────────────────────────────────────────────────────────
router.get('/images/catalog', async (req, res) => {
  try {
    const catalogPath = path.join(DEMO_DATA_DIR, 'IMAGE_CATALOG.json');
    const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf-8'));
    
    res.json({
      success: true,
      data: catalog,
      message: `${catalog.total_count} demo images available`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch image catalog'
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/demo/images/business - Business Document Images
// ─────────────────────────────────────────────────────────────────────────
router.get('/images/business', async (req, res) => {
  try {
    const catalogPath = path.join(DEMO_DATA_DIR, 'IMAGE_CATALOG.json');
    const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf-8'));
    
    // Filter only business documents (not photos)
    const businessImages = catalog.images.filter(img => 
      img.document_type !== 'PHOTO' && img.filename.endsWith('.jpeg')
    );
    
    res.json({
      success: true,
      count: businessImages.length,
      data: businessImages,
      categories: {
        JOBWORK_CHALLAN: 1,
        REGISTER: 1,
        JOB_CARD: 1,
        INSPECTION_FORM: 1,
        CERTIFICATE: 4,
        TAX_INVOICE: 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business images'
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/demo/images/photos - Process Photos
// ─────────────────────────────────────────────────────────────────────────
router.get('/images/photos', async (req, res) => {
  try {
    const catalogPath = path.join(DEMO_DATA_DIR, 'IMAGE_CATALOG.json');
    const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf-8'));
    
    // Filter only photos
    const photos = catalog.images.filter(img => 
      img.document_type === 'PHOTO' && img.filename.endsWith('.jpg')
    );
    
    res.json({
      success: true,
      count: photos.length,
      data: photos
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch process photos'
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/demo/excel-data - Parsed Excel Demo Data
// ─────────────────────────────────────────────────────────────────────────
router.get('/excel-data', async (req, res) => {
  try {
    const excelPath = path.join(DEMO_DATA_DIR, 'EXCEL_DATA.json');
    const excelData = JSON.parse(await fs.readFile(excelPath, 'utf-8'));
    
    res.json({
      success: true,
      data: excelData,
      message: 'Excel demo data loaded'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Excel data'
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/demo/statistics - Demo Data Statistics
// ─────────────────────────────────────────────────────────────────────────
router.get('/statistics', async (req, res) => {
  try {
    const catalogPath = path.join(DEMO_DATA_DIR, 'IMAGE_CATALOG.json');
    const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf-8'));
    
    const stats = {
      images: {
        total: catalog.total_count,
        jpeg: catalog.images.filter(i => i.filename.endsWith('.jpeg')).length,
        jpg: catalog.images.filter(i => i.filename.endsWith('.jpg')).length,
        total_size_mb: catalog.total_size_mb
      },
      documents: {
        jobwork_challans: 1,
        registers: 1,
        job_cards: 1,
        inspection_forms: 1,
        certificates: 4,
        tax_invoices: 1,
        photos: 8
      },
      business_value: {
        total_documented_transaction: '₹7,434,000',
        weight_processed_kg: 63,
        temperature_cycles: 5,
        inspection_points: 40
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate statistics'
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/demo/templates - Document Templates
// ─────────────────────────────────────────────────────────────────────────
router.get('/templates', async (req, res) => {
  try {
    const templates = {
      documents: [
        {
          name: 'Jobwork Challan',
          type: 'JOBWORK_CHALLAN',
          image: '1.jpeg',
          fields: ['challanNo', 'date', 'fromParty', 'toParty', 'items', 'totalValue'],
          sample_values: {
            challanNo: '1B54',
            date: '10/03/2026',
            fromParty: 'Sheetal Dies & Tools',
            toParty: 'Shital Vacuum Treat',
            total: '₹31,010'
          }
        },
        {
          name: 'Job Card',
          type: 'JOB_CARD',
          image: '3.jpeg',
          fields: ['jobCardNo', 'items', 'processes', 'colorCoding'],
          sample_values: {
            items_count: 4,
            processes: ['Vacuum Hardening', 'Tempering'],
            colors: { WHITE: 'Regular', RED: 'Rework', BLUE: 'New Dev' }
          }
        },
        {
          name: 'Incoming Inspection',
          type: 'INSPECTION_FORM',
          image: '3.1.jpeg',
          fields: ['categorization', 'hardness', 'distortionMeasurement'],
          sample_values: {
            hardness_required: '54-56 HRC',
            measurement_points: 8
          }
        },
        {
          name: 'Test Certificate',
          type: 'CERTIFICATE',
          pages: 4,
          images: ['4.1.jpeg', '4.2.jpeg', '4.3.jpeg', '4.4.jpeg'],
          fields: ['certificateNo', 'hardnessAchieved', 'mpiInspection']
        },
        {
          name: 'Tax Invoice',
          type: 'TAX_INVOICE',
          image: '5.jpeg',
          fields: ['invoiceNo', 'invoiceDate', 'items', 'tax', 'grandTotal'],
          sample_values: {
            invoiceNo: 'SVT/25-28/16314',
            subtotal: '₹6,300,000',
            cgst: '₹567,000',
            sgst: '₹567,000',
            grandTotal: '₹7,434,000'
          }
        }
      ]
    };
    
    res.json({
      success: true,
      data: templates
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
});

module.exports = router;
