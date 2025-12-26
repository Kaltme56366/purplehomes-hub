/**
 * Purple Homes - Social Media Caption Templates
 *
 * Brand Voice:
 * - Professional yet approachable
 * - Confident without being pushy
 * - Local expertise focused
 * - Investment-minded
 *
 * Brand Colors:
 * - Primary: Deep Purple (#7C3AED)
 * - Accent: Gold (#D4AF37)
 * - Neutral: Charcoal (#1F2937)
 */

export type TemplateCategory =
  | 'listing'
  | 'just-listed'
  | 'open-house'
  | 'price-drop'
  | 'sold'
  | 'coming-soon'
  | 'investment'
  | 'lifestyle';

export type TemplateStyle =
  | 'modern-minimal'
  | 'bold-gradient'
  | 'luxury-dark'
  | 'friendly-bright'
  | 'professional-clean'
  | 'urban-edge';

export interface PostTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  style: TemplateStyle;
  description: string;
  thumbnail: string;
  platforms: ('facebook' | 'instagram' | 'linkedin')[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  overlayOpacity: number;
  fontFamily: string;
  imagePosition: 'background' | 'top' | 'left' | 'right';
  showPrice: boolean;
  showAddress: boolean;
  showBedBath: boolean;
  showSqft: boolean;
  showLogo: boolean;
  captionTemplate: {
    facebook: string;
    instagram: string;
    linkedin: string;
  };
  hashtags: string[];
}

// Template placeholders:
// {{price}} - Property price formatted
// {{address}} - Full address
// {{city}} - City name
// {{beds}} - Number of bedrooms
// {{baths}} - Number of bathrooms
// {{sqft}} - Square footage
// {{propertyType}} - Type of property
// {{downPayment}} - Down payment amount
// {{monthlyPayment}} - Monthly payment amount

export const postTemplates: PostTemplate[] = [
  // ============ JUST LISTED TEMPLATES ============
  {
    id: 'ph-just-listed-professional',
    name: 'Just Listed - Professional',
    category: 'just-listed',
    style: 'modern-minimal',
    description: 'Clean, professional announcement for new listings',
    thumbnail: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
    platforms: ['facebook', 'instagram', 'linkedin'],
    backgroundColor: '#1F2937',
    textColor: '#ffffff',
    accentColor: '#7C3AED',
    overlayOpacity: 0.5,
    fontFamily: 'system-ui, sans-serif',
    imagePosition: 'background',
    showPrice: true,
    showAddress: true,
    showBedBath: true,
    showSqft: true,
    showLogo: true,
    captionTemplate: {
      facebook: `NEW LISTING in {{city}}

📍 {{address}}
💰 {{price}}
🏠 {{beds}} Beds • {{baths}} Baths • {{sqft}} SF

This {{propertyType}} just hit the market and it's everything you've been looking for. Prime location, move-in ready, and priced right.

Interested? Send us a message to schedule your private showing.

Purple Homes | Your Trusted Real Estate Partner`,
      instagram: `✨ JUST LISTED ✨

📍 {{city}}
💰 {{price}}
🏠 {{beds}} BD | {{baths}} BA | {{sqft}} SF

Fresh on the market and ready for its new owner.

DM us for details! 💜

—
#PurpleHomes #JustListed #{{city}}RealEstate #NewListing #HomeForSale #RealEstateAgent #DreamHome #HouseHunting #PropertyListing #LuxuryRealEstate`,
      linkedin: `🏠 New Listing Announcement

I'm pleased to present this exceptional {{propertyType}} in {{city}}.

📍 {{address}}
💰 {{price}}
🏠 {{beds}} Bedrooms | {{baths}} Bathrooms | {{sqft}} sq ft

This property represents an excellent opportunity for homebuyers and investors seeking value in a desirable location.

Contact Purple Homes to learn more about this listing.

#RealEstate #NewListing #{{city}} #PropertyInvestment #PurpleHomes`,
    },
    hashtags: ['PurpleHomes', 'JustListed', 'NewListing', 'RealEstate', 'HomeForSale'],
  },
  {
    id: 'ph-just-listed-engaging',
    name: 'Just Listed - Engaging',
    category: 'just-listed',
    style: 'friendly-bright',
    description: 'Conversational tone that drives engagement',
    thumbnail: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
    platforms: ['facebook', 'instagram'],
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    accentColor: '#A78BFA',
    overlayOpacity: 0.4,
    fontFamily: 'system-ui, sans-serif',
    imagePosition: 'background',
    showPrice: true,
    showAddress: true,
    showBedBath: true,
    showSqft: false,
    showLogo: true,
    captionTemplate: {
      facebook: `Stop scrolling — this one's worth a look 👀

{{beds}} beds, {{baths}} baths in {{city}}
Asking: {{price}}

What would you love most about this home?
A) The location
B) The space
C) All of the above

Drop your answer below! ⬇️

📍 {{address}}`,
      instagram: `POV: You just found your dream home 🏡

{{city}} | {{price}}
{{beds}} BD | {{baths}} BA

Save this post. Trust us. 📌

—
DM "INFO" for details 💜

#PurpleHomes #JustListed #{{city}} #HomeForSale #DreamHome #RealEstate #HouseGoals #NewListing #FirstTimeHomeBuyer #PropertyOfTheDay`,
      linkedin: `New to market in {{city}}.

{{address}}
{{price}} | {{beds}} BD | {{baths}} BA

Reach out to Purple Homes for more information.

#RealEstate #{{city}} #NewListing`,
    },
    hashtags: ['PurpleHomes', 'JustListed', 'DreamHome', 'HouseGoals'],
  },

  // ============ LUXURY TEMPLATES ============
  {
    id: 'ph-luxury-showcase',
    name: 'Luxury Showcase',
    category: 'listing',
    style: 'luxury-dark',
    description: 'Elegant presentation for premium properties',
    thumbnail: 'linear-gradient(135deg, #1F2937 0%, #000 50%, #D4AF37 100%)',
    platforms: ['facebook', 'instagram', 'linkedin'],
    backgroundColor: '#0a0a0a',
    textColor: '#D4AF37',
    accentColor: '#D4AF37',
    overlayOpacity: 0.6,
    fontFamily: 'Georgia, serif',
    imagePosition: 'background',
    showPrice: true,
    showAddress: true,
    showBedBath: true,
    showSqft: true,
    showLogo: true,
    captionTemplate: {
      facebook: `E X C L U S I V E   L I S T I N G

{{address}}
{{city}}

◾ {{beds}} Bedrooms
◾ {{baths}} Bathrooms
◾ {{sqft}} Square Feet
◾ {{price}}

This residence exemplifies sophisticated living. Every detail has been thoughtfully curated for the discerning buyer.

Private showings by appointment only.

Purple Homes | Luxury Real Estate`,
      instagram: `L U X U R Y

📍 {{city}}
💎 {{price}}

{{beds}} BD • {{baths}} BA • {{sqft}} SF

Elevated living starts here.

—
DM for private showing 💜

#PurpleHomes #LuxuryRealEstate #{{city}}Luxury #MillionDollarListing #LuxuryHomes #HighEndRealEstate #LuxuryLifestyle #DreamHome #EstateLife #Mansion`,
      linkedin: `Presenting: An Exceptional Luxury Property

📍 {{address}}, {{city}}
💰 {{price}}

This {{sqft}} sq ft residence features {{beds}} bedrooms and {{baths}} bathrooms, offering an unparalleled living experience for the discerning buyer.

Purple Homes specializes in connecting qualified buyers with extraordinary properties.

#LuxuryRealEstate #{{city}} #PurpleHomes #Investment`,
    },
    hashtags: ['PurpleHomes', 'LuxuryRealEstate', 'LuxuryHomes', 'MillionDollarListing'],
  },

  // ============ INVESTMENT TEMPLATES ============
  {
    id: 'ph-investment-focused',
    name: 'Investment Focus',
    category: 'investment',
    style: 'professional-clean',
    description: 'Data-driven presentation for investor clients',
    thumbnail: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    platforms: ['facebook', 'linkedin'],
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    accentColor: '#10B981',
    overlayOpacity: 0.7,
    fontFamily: 'system-ui, sans-serif',
    imagePosition: 'background',
    showPrice: true,
    showAddress: true,
    showBedBath: true,
    showSqft: true,
    showLogo: true,
    captionTemplate: {
      facebook: `📊 INVESTMENT OPPORTUNITY

{{address}}, {{city}}

💵 Price: {{price}}
📉 Down Payment: {{downPayment}}
📈 Est. Monthly: {{monthlyPayment}}

🏠 {{beds}} BD | {{baths}} BA | {{sqft}} SF

Strong rental market. Solid fundamentals. Growing area.

Serious investors: Let's run the numbers together.

Purple Homes | Real Estate Investment`,
      instagram: `💰 INVESTOR ALERT

{{city}} Property
{{price}}
{{downPayment}} down

{{beds}}BD | {{baths}}BA | {{sqft}}SF

The numbers work. Let's talk.

—
DM "NUMBERS" for breakdown 📊

#PurpleHomes #RealEstateInvesting #PassiveIncome #InvestorLife #RentalProperty #CashFlow #{{city}} #WealthBuilding #PropertyInvestment`,
      linkedin: `📊 Investment Property Analysis

{{address}}, {{city}}

Investment Metrics:
• Asking Price: {{price}}
• Est. Down Payment: {{downPayment}}
• Est. Monthly Payment: {{monthlyPayment}}

Property Details:
• {{beds}} Bedrooms | {{baths}} Bathrooms | {{sqft}} sq ft

This property presents a compelling opportunity in {{city}}'s growing market. Ideal for portfolio diversification or investors seeking solid fundamentals.

Purple Homes provides detailed investment analysis for serious buyers. Connect to discuss.

#RealEstateInvesting #InvestmentProperty #{{city}} #PassiveIncome #PurpleHomes`,
    },
    hashtags: ['PurpleHomes', 'Investment', 'PassiveIncome', 'RealEstateInvesting'],
  },

  // ============ OPEN HOUSE TEMPLATES ============
  {
    id: 'ph-open-house-invite',
    name: 'Open House Invite',
    category: 'open-house',
    style: 'friendly-bright',
    description: 'Welcoming invitation for open house events',
    thumbnail: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
    platforms: ['facebook', 'instagram'],
    backgroundColor: '#7C3AED',
    textColor: '#ffffff',
    accentColor: '#D4AF37',
    overlayOpacity: 0.3,
    fontFamily: 'system-ui, sans-serif',
    imagePosition: 'background',
    showPrice: true,
    showAddress: true,
    showBedBath: true,
    showSqft: false,
    showLogo: true,
    captionTemplate: {
      facebook: `🏠 OPEN HOUSE THIS WEEKEND!

📍 {{address}}
{{city}}

🗓️ Saturday & Sunday
⏰ 1:00 PM - 4:00 PM

💰 {{price}}
🛏️ {{beds}} Beds | 🛁 {{baths}} Baths

Come see it in person — photos don't do it justice.

No appointment needed. Just stop by!

Purple Homes | See You There 💜`,
      instagram: `OPEN HOUSE 🏠

📍 {{city}}
🗓️ This Weekend!
💰 {{price}}

{{beds}} BD | {{baths}} BA

Come through! No appointment needed 👋

—
Save this post as a reminder 📌

#PurpleHomes #OpenHouse #{{city}} #HouseHunting #HomeForSale #WeekendPlans #RealEstate #HomeTour #DreamHome`,
      linkedin: `Open House Event

{{address}}, {{city}}
{{price}} | {{beds}} Beds | {{baths}} Baths

Join us this weekend to tour this property. All are welcome.

Purple Homes | #OpenHouse #{{city}}RealEstate`,
    },
    hashtags: ['PurpleHomes', 'OpenHouse', 'HouseHunting', 'HomeTour'],
  },

  // ============ PRICE DROP TEMPLATES ============
  {
    id: 'ph-price-reduced',
    name: 'Price Reduced',
    category: 'price-drop',
    style: 'bold-gradient',
    description: 'Attention-grabbing price reduction announcement',
    thumbnail: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
    platforms: ['facebook', 'instagram'],
    backgroundColor: '#1a0a0a',
    textColor: '#ffffff',
    accentColor: '#DC2626',
    overlayOpacity: 0.5,
    fontFamily: 'system-ui, sans-serif',
    imagePosition: 'background',
    showPrice: true,
    showAddress: true,
    showBedBath: true,
    showSqft: true,
    showLogo: true,
    captionTemplate: {
      facebook: `⚡ PRICE REDUCED ⚡

{{address}}
{{city}}

NEW PRICE: {{price}}

🛏️ {{beds}} Beds | 🛁 {{baths}} Baths | 📐 {{sqft}} SF

The seller is motivated and the opportunity is now.

This won't last at this price. Reach out today.

Purple Homes | Let's Make It Happen`,
      instagram: `🚨 PRICE DROP 🚨

{{city}}
NOW: {{price}}

{{beds}}BD | {{baths}}BA | {{sqft}}SF

Opportunity knocks once.

—
DM before it's gone 💜

#PurpleHomes #PriceReduced #{{city}} #HotDeal #RealEstate #MotivatedSeller #HomeForSale #DreamHome`,
      linkedin: `Price Adjustment: {{city}}

{{address}}
New Price: {{price}}

{{beds}} Beds | {{baths}} Baths | {{sqft}} sq ft

This property has been strategically repriced and represents excellent value in the current market.

Contact Purple Homes for details.

#RealEstate #{{city}} #PriceReduction #PurpleHomes`,
    },
    hashtags: ['PurpleHomes', 'PriceReduced', 'HotDeal', 'MotivatedSeller'],
  },

  // ============ SOLD TEMPLATES ============
  {
    id: 'ph-sold-success',
    name: 'Sold - Success Story',
    category: 'sold',
    style: 'bold-gradient',
    description: 'Celebrate closed deals and build credibility',
    thumbnail: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
    platforms: ['facebook', 'instagram', 'linkedin'],
    backgroundColor: '#1F2937',
    textColor: '#ffffff',
    accentColor: '#D4AF37',
    overlayOpacity: 0.5,
    fontFamily: 'system-ui, sans-serif',
    imagePosition: 'background',
    showPrice: false,
    showAddress: true,
    showBedBath: false,
    showSqft: false,
    showLogo: true,
    captionTemplate: {
      facebook: `🎉 S O L D !

{{address}}
{{city}}

Congratulations to our amazing clients on their new home! 🔑

Another family matched with their perfect property. This is why we do what we do.

Thinking about buying or selling? Let Purple Homes guide you home.`,
      instagram: `✨ S O L D ✨

{{city}}

Keys in hand. Dreams realized. 🔑🏠

Congratulations to our incredible buyers! 💜

—
Your story could be next. DM us to start.

#PurpleHomes #JustSold #{{city}} #Sold #ClosingDay #NewHomeowners #DreamHome #RealEstateSuccess #HappyClients #Realtor`,
      linkedin: `🔑 SOLD: {{city}}

{{address}}

Pleased to announce another successful closing for Purple Homes.

Congratulations to the new homeowners. It was a privilege to guide you through this journey.

If you're considering buying or selling, I'd be honored to help you achieve your real estate goals.

#JustSold #RealEstate #{{city}} #PurpleHomes #ClosingDay`,
    },
    hashtags: ['PurpleHomes', 'JustSold', 'Sold', 'ClosingDay', 'NewHomeowners'],
  },

  // ============ COMING SOON TEMPLATES ============
  {
    id: 'ph-coming-soon',
    name: 'Coming Soon - Teaser',
    category: 'coming-soon',
    style: 'urban-edge',
    description: 'Build anticipation for upcoming listings',
    thumbnail: 'linear-gradient(135deg, #1F2937 0%, #7C3AED 100%)',
    platforms: ['facebook', 'instagram'],
    backgroundColor: '#0f1419',
    textColor: '#ffffff',
    accentColor: '#A78BFA',
    overlayOpacity: 0.6,
    fontFamily: 'system-ui, sans-serif',
    imagePosition: 'background',
    showPrice: false,
    showAddress: false,
    showBedBath: true,
    showSqft: true,
    showLogo: true,
    captionTemplate: {
      facebook: `👀 COMING SOON to {{city}}...

🏠 {{beds}} Beds | {{baths}} Baths | {{sqft}} SF

Something special is about to hit the market.

Want early access before it goes live?

Drop a 💜 in the comments or DM us to get on the list.

Purple Homes | First Access Matters`,
      instagram: `👀 COMING SOON

{{city}}
{{beds}}BD | {{baths}}BA | {{sqft}}SF

Something good is coming...

—
💜 = Get early access
DM "FIRST" to join the list

#PurpleHomes #ComingSoon #{{city}} #RealEstate #ExclusiveListing #OffMarket #SneakPeek #NewListing #HomeForSale`,
      linkedin: `Coming Soon: {{city}}

{{beds}} Bedrooms | {{baths}} Bathrooms | {{sqft}} sq ft

A new listing will be available shortly. Contact Purple Homes for early access and details.

#ComingSoon #{{city}} #RealEstate #PurpleHomes`,
    },
    hashtags: ['PurpleHomes', 'ComingSoon', 'ExclusiveListing', 'SneakPeek'],
  },

  // ============ LIFESTYLE TEMPLATES ============
  {
    id: 'ph-lifestyle-living',
    name: 'Lifestyle Focus',
    category: 'lifestyle',
    style: 'friendly-bright',
    description: 'Emphasize the lifestyle, not just the property',
    thumbnail: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #D4AF37 100%)',
    platforms: ['facebook', 'instagram'],
    backgroundColor: '#f0fdf4',
    textColor: '#1F2937',
    accentColor: '#7C3AED',
    overlayOpacity: 0.2,
    fontFamily: 'system-ui, sans-serif',
    imagePosition: 'background',
    showPrice: true,
    showAddress: true,
    showBedBath: true,
    showSqft: false,
    showLogo: true,
    captionTemplate: {
      facebook: `It's not just a house — it's a lifestyle 🌳

{{address}}
{{city}}

💰 {{price}}
🛏️ {{beds}} Beds | 🛁 {{baths}} Baths

Picture this:
☕ Morning coffee on the patio
🏃 Evening walks through the neighborhood
👨‍👩‍👧 Room for the whole family to grow

This is where your next chapter begins.

Purple Homes | Find Your Lifestyle`,
      instagram: `More than a home. A lifestyle. 🌳

{{city}} | {{price}}
{{beds}}BD | {{baths}}BA

Imagine:
☕ Quiet mornings
🌅 Perfect sunsets
👋 Friendly neighbors

This could be yours.

—
DM to make it happen 💜

#PurpleHomes #LifestyleLiving #{{city}} #DreamHome #HomeGoals #FamilyHome #CommunityLife #RealEstate`,
      linkedin: `{{address}}, {{city}}

{{price}} | {{beds}} Beds | {{baths}} Baths

Beyond the property features, this home offers exceptional quality of life in a thriving community.

Purple Homes | #RealEstate #{{city}} #LifestyleLiving`,
    },
    hashtags: ['PurpleHomes', 'LifestyleLiving', 'DreamHome', 'FamilyHome'],
  },
];

// Helper function to get templates by category
export const getTemplatesByCategory = (category: TemplateCategory): PostTemplate[] => {
  return postTemplates.filter(t => t.category === category);
};

// Helper function to get templates by style
export const getTemplatesByStyle = (style: TemplateStyle): PostTemplate[] => {
  return postTemplates.filter(t => t.style === style);
};

// Helper function to get templates by platform
export const getTemplatesByPlatform = (platform: 'facebook' | 'instagram' | 'linkedin'): PostTemplate[] => {
  return postTemplates.filter(t => t.platforms.includes(platform));
};

// Helper function to fill template placeholders with property data
export const fillTemplatePlaceholders = (
  template: string,
  property: {
    price?: number;
    address?: string;
    city?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    propertyType?: string;
    downPayment?: number;
    monthlyPayment?: number;
  }
): string => {
  const formatPrice = (price?: number) =>
    price ? `$${price.toLocaleString()}` : 'Contact for Price';

  const formatNumber = (num?: number) =>
    num ? num.toLocaleString() : 'N/A';

  return template
    .replace(/\{\{price\}\}/g, formatPrice(property.price))
    .replace(/\{\{address\}\}/g, property.address || 'Address Available Soon')
    .replace(/\{\{city\}\}/g, property.city || 'Location')
    .replace(/\{\{beds\}\}/g, String(property.beds || 0))
    .replace(/\{\{baths\}\}/g, String(property.baths || 0))
    .replace(/\{\{sqft\}\}/g, formatNumber(property.sqft))
    .replace(/\{\{propertyType\}\}/g, property.propertyType || 'home')
    .replace(/\{\{downPayment\}\}/g, formatPrice(property.downPayment))
    .replace(/\{\{monthlyPayment\}\}/g, formatPrice(property.monthlyPayment));
};
