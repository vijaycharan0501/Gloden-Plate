import React from 'react';
import { useCart } from '../context/CartContext';

const CategoryList = ({ menu, activeCategory, onAddClick }) => {
  const { cartItems, addToCart, updateCartQuantity } = useCart();

  // Helper to find item quantity in cart
  const getItemCartQty = (itemId) => {
    const item = cartItems.find((item) => item.menuItem._id === itemId);
    return item ? item.quantity : 0;
  };

  const categories = Object.keys(menu);

  // Filter categories to show either the selected one or all
  const categoriesToRender = activeCategory === 'All' 
    ? categories 
    : categories.filter(c => c === activeCategory);

  return (
    <div className="menu-categories-container">
      {categoriesToRender.map((category) => (
        <div 
          key={category} 
          id={`category-${category.toLowerCase().replace(/\s+/g, '-')}`} 
          className="menu-category-section animate-fade-in"
        >
          <h2 className="category-title">{category}</h2>
          <div className="menu-items-grid">
            {menu[category].map((item) => {
              const qty = getItemCartQty(item._id);

              return (
                <div key={item._id} className="menu-item-card glass-panel">
                  
                  {/* Top Image Wrapper with Absolute Badges */}
                  <div className="menu-item-image-wrapper">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="menu-item-image"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=300&q=80';
                        }}
                      />
                    ) : (
                      <div className="menu-item-image-placeholder">
                        <span>Golden Plate</span>
                      </div>
                    )}
                    
                    {/* Floating Premium Diet Badge */}
                    <div className="menu-item-diet-badge">
                      <span className={item.isVeg ? 'veg-indicator' : 'nonveg-indicator'} />
                      <span className="badge-text">{item.isVeg ? 'Veg' : 'Non-Veg'}</span>
                    </div>

                  </div>

                  {/* Bottom Text & Actions Area */}
                  <div className="menu-item-details">
                    <div className="menu-item-header">
                      <h4 className="menu-item-name">{item.name}</h4>
                    </div>
                    
                    <p className="menu-item-desc">{item.description}</p>

                    <div className="menu-item-footer">
                      <span className="menu-item-price">₹{item.price.toFixed(2)}</span>
                      
                      {category === 'Main Course' ? (
                        <button 
                          className="add-cart-btn"
                          onClick={() => onAddClick(item)}
                        >
                          Add to Order
                        </button>
                      ) : qty > 0 ? (
                        <div className="qty-selector">
                          <button 
                            className="qty-btn" 
                            onClick={() => updateCartQuantity(item._id, qty - 1)}
                          >
                            -
                          </button>
                          <span className="qty-val">{qty}</span>
                          <button 
                            className="qty-btn" 
                            onClick={() => updateCartQuantity(item._id, qty + 1)}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="add-cart-btn"
                          onClick={() => addToCart(item, 1)}
                        >
                          Add to Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryList;
