const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Helper function to auto-detect the local IPv4 address of the computer, prioritizing physical interfaces
const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  let fallbackIp = 'localhost';

  for (const name of Object.keys(interfaces)) {
    const nameLower = name.toLowerCase();
    const isVirtual = nameLower.includes('virtual') || 
                      nameLower.includes('vmware') || 
                      nameLower.includes('virtualbox') || 
                      nameLower.includes('wsl') || 
                      nameLower.includes('vethernet') || 
                      nameLower.includes('host-only') ||
                      nameLower.includes('pseudo');

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!isVirtual) {
          return iface.address; // Return physical IP immediately (e.g. Wi-Fi/Ethernet)
        }
        if (fallbackIp === 'localhost') {
          fallbackIp = iface.address; // Keep first virtual interface as fallback
        }
      }
    }
  }
  return fallbackIp;
};

const generateQRCodes = async (tableCount = 10, domain) => {
  try {
    const localIp = getLocalIp();
    const finalDomain = domain || `http://${localIp}:5173`;

    const qrcodesDir = path.join(__dirname, '..', 'qrcodes');
    if (!fs.existsSync(qrcodesDir)) {
      fs.mkdirSync(qrcodesDir, { recursive: true });
    }

    console.log(`\n======================================================`);
    console.log(`Auto-detected local IP address: ${localIp}`);
    console.log(`Generating QR Codes for ${tableCount} tables pointing to domain: ${finalDomain}`);
    console.log(`======================================================\n`);

    for (let tableNum = 1; tableNum <= tableCount; tableNum++) {
      const url = `${finalDomain}/order/${tableNum}`;
      const filePath = path.join(qrcodesDir, `table_${tableNum}.png`);

      await QRCode.toFile(filePath, url, {
        color: {
          dark: '#D4AF37',  // Gold dark color
          light: '#121212', // Dark background to blend in with dark mode menu card!
        },
        width: 300,
        margin: 2
      });

      console.log(`Saved QR code for Table ${tableNum} -> ${filePath} (URL: ${url})`);
    }

    console.log('\nAll QR codes generated successfully with local IP routing!');
  } catch (error) {
    console.error('Error generating QR codes:', error);
  }
};

// If run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const tableCount = parseInt(args[0], 10) || 10;
  const domain = args[1] || null; // Will auto-detect if null
  generateQRCodes(tableCount, domain);
}

module.exports = generateQRCodes;
