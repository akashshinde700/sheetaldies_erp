/**
 * Swagger Configuration & API Documentation
 * Generates OpenAPI 3.0 documentation for all endpoints
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sheetal Dies & Tools ERP API',
      version: '1.0.0',
      description: 'Complete ERP system for manufacturing die shop with job card, quality inspection, invoicing, and jobwork management.',
      contact: {
        name: 'Sheetal Dies & Tools',
        email: 'api@sheetaldies.com',
      },
      license: {
        name: 'Internal Use Only',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server',
      },
      {
        url: 'https://api.sheetaldies.com',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token - valid for 15 minutes',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            code: { type: 'string', example: 'ERR_INVALID_INPUT' },
            message: { type: 'string' },
            field: { type: 'string' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] },
            isActive: { type: 'boolean' },
            lastLogin: { type: 'string', format: 'date-time' },
          },
        },
        Party: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            pinCode: { type: 'string' },
            gstin: { type: 'string', description: 'Encrypted in database' },
            pan: { type: 'string', description: 'Encrypted in database' },
            partyType: { type: 'string', enum: ['CUSTOMER', 'VENDOR', 'BOTH'] },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            bankAccountNumber: { type: 'string', description: 'Encrypted in database' },
            isActive: { type: 'boolean' },
          },
        },
        JobCard: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            jobCardNo: { type: 'string' },
            customerId: { type: 'integer' },
            partId: { type: 'integer' },
            quantity: { type: 'number' },
            status: { type: 'string' },
            operationMode: { type: 'string' },
            receivedDate: { type: 'string', format: 'date' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        TaxInvoice: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            invoiceNo: { type: 'string' },
            fromPartyId: { type: 'integer' },
            toPartyId: { type: 'integer' },
            invoiceDate: { type: 'string', format: 'date' },
            grandTotal: { type: 'number' },
            paymentStatus: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  amount: { type: 'number' },
                  gstAmount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
