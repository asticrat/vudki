import React from 'react';

const GlassCard = ({ children, className = "", ...props }) => {
    return (
        <div className={`glass-container ${className}`} {...props}>
            <div className="glass-filter"></div>
            <div className="glass-overlay"></div>
            <div className="glass-specular"></div>
            <div className="glass-content">
                {children}
            </div>
        </div>
    );
};

export default GlassCard;
