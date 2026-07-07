const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const MenuItem = require('./models/MenuItem');
const User = require('./models/User');
const generateQRCodes = require('./utils/generateQR');
require('dotenv').config();

const menuItems = [
  // Starters
  {
    name: 'Paneer Tikka Angara',
    description: 'Cottage cheese cubes marinated in a fiery spiced yogurt, grilled over charcoal tandoor.',
    price: 280,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Hara Bhara Kebab',
    description: 'Crispy pan-fried patties made of spinach, green peas, mashed potatoes and warm spices.',
    price: 220,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Truffle Garlic Mushrooms',
    description: 'Fresh button mushrooms sautéed in a rich garlic butter sauce, finished with white truffle oil.',
    price: 260,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Chilli Chicken Dry',
    description: 'Crispy chicken chunks tossed with bell peppers, onions, and green chillies in a soy-garlic glaze.',
    price: 320,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80',
    isVeg: false,
    available: true,
  },
  {
    name: 'Spicy Chicken Wings',
    description: 'Tender chicken wings fried crisp and tossed in house-made spicy honey sriracha glaze.',
    price: 340,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=500&q=80',
    isVeg: false,
    available: true,
  },



  // Beverages
  {
    name: 'Mint Fresh Lime Soda',
    description: 'Refreshing fizzy soda lime with fresh mint leaves and a touch of sweetness.',
    price: 90,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Classic Mango Lassi',
    description: 'A rich and creamy traditional yogurt drink blended with sweet Alphonso mango pulp.',
    price: 120,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Cold Coffee with Gelato',
    description: 'Rich dark espresso blended with cold milk, topped with a scoop of vanilla bean gelato.',
    price: 160,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },

  // Desserts
  {
    name: 'Gulab Jamun with Rabdi',
    description: 'Warm, soft milk-solid dumplings soaked in cardamom sugar syrup, served over cold thickened milk rabdi.',
    price: 150,
    category: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Royal Saffron Rasmalai',
    description: 'Traditional flattened paneer patties soaked in sweet, saffron-infused milk, topped with nuts.',
    price: 140,
    category: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Molten Chocolate Lava Cake',
    description: 'Indulgent chocolate cake with a melting warm chocolate center, served with vanilla scoop.',
    price: 180,
    category: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  
  // Main Course
  {
    name: 'Royal Mutton Biryani',
    description: 'Slow-cooked fragrant basmati rice layered with tender mutton, rich spices, saffron, and fresh herbs.',
    price: 490,
    category: 'Main Course',
    imageUrl: '/images/mutton-biryani.png',
    isVeg: false,
    available: true,
  },
  {
    name: 'Classic Chicken Biryani',
    description: 'Aromatic long-grain basmati rice cooked with succulent chicken pieces, hard-boiled egg, and traditional spices.',
    price: 390,
    category: 'Main Course',
    imageUrl: '/images/chicken-biryani.png',
    isVeg: false,
    available: true,
  },
  {
    name: 'Spicy Prawns Biryani',
    description: 'Juicy prawns marinated in exotic spices, layered with saffron basmati rice and slow-cooked to perfection.',
    price: 450,
    category: 'Main Course',
    imageUrl: '/images/prawns-biryani.png',
    isVeg: false,
    available: true,
  },
  {
    name: 'Gourmet Fish Biryani',
    description: 'Succulent fish tikka pieces layered with fragrant basmati rice, caramelized onions, and aromatic spices.',
    price: 460,
    category: 'Main Course',
    imageUrl: '/images/fish-biryani.png',
    isVeg: false,
    available: true,
  },
  {
    name: 'Tandoori Mushroom Biryani',
    description: 'Spiced button mushrooms and long-grain basmati rice dum-cooked together with fresh mint and fried onions.',
    price: 320,
    category: 'Main Course',
    imageUrl: '/images/mushroom-biryani.png',
    isVeg: true,
    available: true,
  },

  // New Starters
  {
    name: 'Crispy Spring Rolls',
    description: 'Golden crispy wrappers packed with stir-fried vegetables and glass noodles, served with tangy plum dip.',
    price: 180,
    category: 'Starters',
    imageUrl: '/images/crispy-spring-rolls.png',
    isVeg: true,
    available: true,
  },
  {
    name: 'Tandoori Soya Chaap',
    description: 'Soya chunks marinated in rich tandoori spices and yogurt, skewered and charred to perfection.',
    price: 240,
    category: 'Starters',
    imageUrl: '/images/tandoori-soya-chaap.png',
    isVeg: true,
    available: true,
  },
  {
    name: 'Fish Amritsari',
    description: 'Classic Punjabi style carom-flavored, deep-fried fish fingers served with mint chutney and lemon wedges.',
    price: 380,
    category: 'Starters',
    imageUrl: '/images/fish-amritsari.png',
    isVeg: false,
    available: true,
  },
  {
    name: 'Chicken Seekh Kebab',
    description: 'Succulent minced chicken flavored with ginger, garlic, and aromatic spices, roasted on skewers.',
    price: 340,
    category: 'Starters',
    imageUrl: '/images/chicken-seekh-kebab.png',
    isVeg: false,
    available: true,
  },
  {
    name: 'Crispy Corn Pepper Salt',
    description: 'Golden fried sweet corn kernels tossed with spicy green chilies, colorful bell peppers, and scallions.',
    price: 190,
    category: 'Starters',
    imageUrl: '/images/crispy-corn.png',
    isVeg: true,
    available: true,
  },

  // New Desserts
  {
    name: 'Royal Kesar Pista Kulfi',
    description: 'Traditional slow-cooked Indian ice cream enriched with pure saffron, pistachios, and green cardamom.',
    price: 120,
    category: 'Desserts',
    imageUrl: '/images/kesar-kulfi.png',
    isVeg: true,
    available: true,
  },
  {
    name: 'Warm Gajar Halwa',
    description: 'Grated fresh carrots slow-cooked in milk, ghee, and sugar, garnished with toasted almonds and cashews.',
    price: 140,
    category: 'Desserts',
    imageUrl: '/images/gajar-halwa.png',
    isVeg: true,
    available: true,
  },
  {
    name: 'Sizzling Brownie with Gelato',
    description: 'A warm fudge brownie served on a hot sizzler plate, topped with vanilla gelato and bubbling chocolate sauce.',
    price: 220,
    category: 'Desserts',
    imageUrl: '/images/chocolate-brownie.png',
    isVeg: true,
    available: true,
  },
  {
    name: 'Shahi Tukda Royal',
    description: 'Mughlai bread pudding sweet dessert of fried sugar-soaked bread slices steeped in creamy cardamom rabdi.',
    price: 160,
    category: 'Desserts',
    imageUrl: '/images/shahi-tukda.png',
    isVeg: true,
    available: true,
  },
  {
    name: 'Classic Blueberry Cheesecake',
    description: 'Silky smooth baked cream cheese over a graham cracker crust, topped with sweet, tangy blueberry glaze.',
    price: 240,
    category: 'Desserts',
    imageUrl: '/images/blueberry-cheesecake.png',
    isVeg: true,
    available: true,
  },

  // New Mocktails
  {
    name: 'Classic Virgin Mojito',
    description: 'A refreshing muddle of fresh mint leaves, lime slices, sugar syrup, topped with chilled sparkling club soda.',
    price: 140,
    category: 'Mocktails',
    imageUrl: '/images/virgin-mojito.png',
    isVeg: true,
    available: true,
  },
  {
    name: 'Tropical Blue Lagoon',
    description: 'An icy and vibrant mocktail featuring blue curacao syrup, sweet and sour mix, topped with lemonade.',
    price: 150,
    category: 'Mocktails',
    imageUrl: '/images/blue-lagoon.png',
    isVeg: true,
    available: true,
  },
  {
    name: 'Orchard Fruit Punch',
    description: 'A delicious blend of orange, pineapple, and cranberry juices, finished with a splash of ginger ale.',
    price: 160,
    category: 'Mocktails',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Watermelon Mint Cooler',
    description: 'Fresh sweet watermelon juice blended with mint leaves, lemon juice, and a pinch of black salt.',
    price: 130,
    category: 'Mocktails',
    imageUrl: 'https://images.unsplash.com/photo-1502301197179-6522b438ee01?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Mango Chili Margarita',
    description: 'A sweet and spicy fusion of ripe mango puree, fresh lime, agave, with a chili-salt rimmed glass.',
    price: 170,
    category: 'Mocktails',
    imageUrl: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },

  // New Ice Creams
  {
    name: 'Classic Vanilla Bean',
    description: 'Creamy gelato made with premium Madagascar vanilla bean pods, rich and classic flavor.',
    price: 110,
    category: 'Ice Creams',
    imageUrl: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Premium Belgian Chocolate',
    description: 'Decadent, rich dark chocolate ice cream made with finest Belgian cocoa solids.',
    price: 130,
    category: 'Ice Creams',
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Alphonso Mango Delight',
    description: 'Smooth seasonal ice cream churned with the sweet pulp of hand-picked Alphonso mangoes.',
    price: 120,
    category: 'Ice Creams',
    imageUrl: 'https://images.unsplash.com/photo-1501443769991-63e048a7a529?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Roasted Almond Fudge',
    description: 'Vanilla ice cream loaded with toasted almond slivers and a thick chocolate fudge ribbon.',
    price: 140,
    category: 'Ice Creams',
    imageUrl: 'https://images.unsplash.com/photo-1580915411954-282cb1b0d780?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
  {
    name: 'Strawberries & Cream Ripple',
    description: 'Rich cream ice cream swirled with sweet and tart homemade strawberry compote.',
    price: 120,
    category: 'Ice Creams',
    imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=500&q=80',
    isVeg: true,
    available: true,
  },
];

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/golden-plate';
    console.log(`Connecting to database to seed... ${mongoUri}`);
    await mongoose.connect(mongoUri);

    // Clear existing
    console.log('Clearing existing database collections...');
    await MenuItem.deleteMany({});
    await User.deleteMany({});

    // Seed Menu Items
    console.log('Seeding menu items...');
    await MenuItem.insertMany(menuItems);
    console.log(`${menuItems.length} menu items seeded.`);

    // Seed Admin
    console.log('Seeding admin user...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    
    await User.create({
      username: 'admin',
      passwordHash,
    });
    console.log('Admin user seeded (Username: "admin", Password: "admin123").');

    // Generate QRCodes for 10 tables pointing to actual local IP
    const os = require('os');
    const getLocalIp = () => {
      const interfaces = os.networkInterfaces();
      let fallbackIp = '192.168.1.18';

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
              return iface.address; // Wi-Fi/Ethernet physical address
            }
            if (fallbackIp === '192.168.1.18') {
              fallbackIp = iface.address; // Fallback virtual adapter address
            }
          }
        }
      }
      return fallbackIp;
    };
    const localIp = getLocalIp();
    await generateQRCodes(10, `http://${localIp}:5173`);

    console.log('Seeding complete! Closing DB connection.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
