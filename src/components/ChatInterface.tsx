import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Camera, Leaf, Bug, Cloud, Calendar, Paperclip, FileText, X, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AuthModal } from './AuthModal';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { llamaService } from '../lib/llama';
import { getCropAnalysis, getFarmingRecommendations, parseAgricultureData } from '../utils/dataProcessor';
import { WhatsAppWidget } from './WhatsAppWidget';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  category?: string;
  attachment?: {
    name: string;
    type: string;
    size: number;
  };
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    isListening,
    transcript,
    isSupported: speechSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const quickActions = [
    { label: t('cropAdvice'), icon: Leaf, category: 'crop' },
    { label: t('pestDisease'), icon: Bug, category: 'pest' },
    { label: t('weatherAlert'), icon: Cloud, category: 'weather' },
    { label: t('marketUpdate'), icon: () => <span className="text-green-600 font-bold text-lg">R</span>, category: 'market' },
    { label: t('seasonalPlant'), icon: Calendar, category: 'seasonal' },
    { label: t('livestock'), icon: () => <span className="text-amber-600 font-bold text-lg">🐄</span>, category: 'livestock' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when user is authenticated
  useEffect(() => {
    if (user) {
      loadChatHistory();
    } else {
      // Show realistic farming conversation for demo
      setMessages([
        {
          id: '1',
          text: `Hello! I'm AgriAssistant, your farming assistant. How can I help you today?

1️⃣ Ask about crops
2️⃣ Get weather updates  
3️⃣ Pest and disease help
4️⃣ Market prices
5️⃣ Talk to an expert`,
          sender: 'bot',
          timestamp: new Date(),
        },
        {
          id: '2',
          text: "Hello! I'm having trouble with my maize crop. The leaves are turning yellow and I'm not sure what's causing it. Can you help?",
          sender: 'user',
          timestamp: new Date(Date.now() - 280000), // 4 min 40 sec ago
          category: 'crop',
        },
        {
          id: '3',
          text: "Yellow leaves on maize can indicate several issues. Let me help you diagnose this:\n\n🌱 **Most Common Causes:**\n• **Nitrogen deficiency** - yellowing starts from older leaves\n• **Overwatering** - yellowing with wilting\n• **Pest damage** - check for aphids or stem borers\n• **Disease** - look for spots or patterns\n\n📋 **Quick Check:**\n1. Are the yellow leaves at the bottom or top of the plant?\n2. Is the soil waterlogged or dry?\n3. Any visible insects or spots on leaves?\n\nCan you tell me more about these symptoms?",
          sender: 'bot',
          timestamp: new Date(Date.now() - 270000),
          category: 'crop',
        },
        {
          id: '4',
          text: "The yellowing is starting from the bottom leaves and moving up. The soil feels quite wet - we've had a lot of rain recently. I don't see any insects though.",
          sender: 'user',
          timestamp: new Date(Date.now() - 240000), // 4 minutes ago
          category: 'crop',
        },
        {
          id: '5',
          text: "Based on your description, this sounds like **nitrogen deficiency** combined with **waterlogged conditions**. Here's what's happening and how to fix it:\n\n🔍 **The Problem:**\n• Excess water prevents roots from absorbing nitrogen properly\n• Nitrogen leaches away in waterlogged soil\n• Bottom-up yellowing is classic nitrogen deficiency\n\n✅ **Solutions:**\n1. **Improve drainage** - create furrows between rows\n2. **Apply nitrogen fertilizer** - use LAN (28% N) at 150kg/ha\n3. **Wait for soil to dry** before applying fertilizer\n4. **Side-dress** with compost for long-term soil health\n\n⚠️ **Important:** Don't fertilize wet soil - wait 2-3 days after rain stops.\n\nWould you like specific guidance on drainage techniques?",
          sender: 'bot',
          timestamp: new Date(Date.now() - 230000),
          category: 'crop',
        },
        {
          id: '6',
          text: "That makes sense! Yes, please tell me about drainage. Also, I have cattle and I'm worried about the wet conditions affecting them too.",
          sender: 'user',
          timestamp: new Date(Date.now() - 180000), // 3 minutes ago
          category: 'livestock',
        },
        {
          id: '7',
          text: "Great question! Wet conditions affect both crops and livestock. Let me help with both:\n\n🚜 **Field Drainage Solutions:**\n• **Contour furrows** - dig 30cm deep channels every 10m\n• **French drains** - gravel-filled trenches for permanent drainage\n• **Raised beds** - plant on ridges 20-30cm high\n• **Cover crops** - plant rye grass to absorb excess water\n\n🐄 **Cattle Care in Wet Conditions:**\n• **Hoof health** - check daily for foot rot (foul smell, limping)\n• **Dry shelter** - ensure access to covered areas\n• **Feed quality** - wet feed can develop mold, check regularly\n• **Mineral supplements** - add zinc and copper for hoof strength\n• **Move cattle** - rotate to drier paddocks if possible\n\n⚠️ **Watch for:** Lameness, reduced appetite, or respiratory issues in cattle.\n\nHow many cattle do you have, and do you have adequate shelter?",
          sender: 'bot',
          timestamp: new Date(Date.now() - 170000),
          category: 'livestock',
        },
        {
          id: '8',
          text: "I have 15 cattle. They have a basic shelter but it's not fully covered. Some are showing signs of limping. What should I do immediately?",
          sender: 'user',
          timestamp: new Date(Date.now() - 120000), // 2 minutes ago
          category: 'livestock',
        },
        {
          id: '9',
          text: "🚨 **Immediate Action Required!** Limping cattle likely have foot rot - this spreads quickly in wet conditions.\n\n**TODAY:**\n1. **Isolate limping cattle** - separate from healthy ones\n2. **Examine hooves** - look for swelling, heat, foul smell\n3. **Clean hooves** - use warm water and antiseptic\n4. **Apply treatment** - zinc sulfate footbath (10% solution)\n5. **Call vet** - if more than 2 animals affected\n\n**THIS WEEK:**\n1. **Improve shelter** - add more roofing/windbreaks\n2. **Dry bedding** - use straw or wood shavings\n3. **Footbath routine** - weekly zinc sulfate treatment\n4. **Nutrition boost** - add vitamin E and selenium supplements\n\n**PREVENTION:**\n• Trim hooves every 6 months\n• Maintain dry walking areas\n• Regular hoof inspections\n\n💰 **Cost estimate:** Zinc sulfate R150, bedding R500/week\n\nDo you have zinc sulfate available, or should I help you find suppliers?",
          sender: 'bot',
          timestamp: new Date(Date.now() - 110000),
          category: 'livestock',
        },
        {
          id: '10',
          text: "I don't have zinc sulfate. Can you help me find suppliers? Also, what about the cost - are there any government programs that might help?",
          sender: 'user',
          timestamp: new Date(Date.now() - 60000), // 1 minute ago
          category: 'schemes',
        },
        {
          id: '11',
          text: "Absolutely! Let me help with both suppliers and funding options:\n\n🏪 **Zinc Sulfate Suppliers:**\n• **Afgri** - R145/25kg bag (011 549 2000)\n• **NWK** - R150/25kg bag (018 464 7800)\n• **Farmers Co-op** - R140/25kg bag (local branches)\n• **Online:** Agrimark.co.za - delivery available\n\n💰 **Government Support Available:**\n\n**1. Smallholder Agricultural Support Programme**\n• Up to R50,000 for livestock health\n• Covers veterinary costs and treatments\n• Application deadline: March 31, 2024\n• Contact: 012 319 7000\n\n**2. Agricultural Development Fund**\n• Emergency livestock support\n• Covers 70% of treatment costs\n• Fast-track approval for disease outbreaks\n• Contact: 012 319 7100\n\n**3. Provincial Disaster Relief**\n• Weather-related livestock losses\n• Covers infrastructure repairs\n• Contact your local extension officer\n\n📋 **Documents needed:** ID, farm registration, livestock count, vet report\n\n💡 **Pro tip:** I can also provide data-driven crop recommendations based on our agricultural database. Try asking \"compare maize and tomato yields\" or \"what's best for clay soil with drip irrigation?\"",
          sender: 'bot',
          timestamp: new Date(Date.now() - 50000),
          category: 'schemes',
        },
        {
          id: '12',
          text: "That's very helpful! Can you show me data analysis for maize yields? I want to make data-driven decisions for next season.",
          sender: 'user',
          timestamp: new Date(Date.now() - 30000), // 30 seconds ago
          category: 'crop',
        },
        {
          id: '13',
          text: "🌾 **MAIZE Analysis** (Based on real farm data):\n\n📊 **Performance Metrics:**\n• Average Yield: 20.16 tons/acre\n• Best Irrigation: Drip\n• Optimal Soil: Sandy\n• Fertilizer Usage: 2.19 tons\n• Water Requirement: 44,393 m³\n\n💡 **Key Recommendations:**\n• 📈 **Yield Optimization**: Current average yield for Maize is 20.16 tons. Consider increasing fertilizer application or improving soil preparation.\n• 💧 **Best Irrigation**: Drip irrigation shows highest yields for Maize. Average water usage: 44,393 cubic meters.\n• 🌱 **Optimal Soil**: Sandy soil performs best for Maize. Consider soil amendments if your soil type differs.\n\n🎯 **Data Insight**: Farms using drip irrigation on sandy soil achieved 39.96 tons/acre - nearly double the average! This shows the importance of proper irrigation and soil matching.",
          sender: 'bot',
          timestamp: new Date(Date.now() - 20000),
          category: 'crop',
        },
      ]);
    }
  }, [user, t]);

  // Update input text when speech transcript changes
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
      }
      setAttachedFile(file);
    } else {
      alert('Please select a PDF file only');
    }
    // Reset the input
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
  };

  const shareToWhatsApp = () => {
    const conversationText = messages
      .slice(-6) // Get last 6 messages
      .map(msg => `${msg.sender === 'user' ? '👨‍🌾 Farmer' : '🤖 FarmBot'}: ${msg.text}`)
      .join('\n\n');
    
    const shareMessage = `🌾 My FarmBot Conversation:\n\n${conversationText}\n\n📱 Get farming advice at AgriAssist`;
    const encodedMessage = encodeURIComponent(shareMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadChatHistory = async () => {

    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const chatMessages: Message[] = data.map(msg => ({
          id: msg.id,
          text: msg.message,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
          category: msg.category || undefined,
          // Note: Attachments would need to be stored separately in a real implementation
        }));
        setMessages(chatMessages);
      } else {
        // Welcome message for authenticated users
        setMessages([
          {
            id: '1',
            text: `${t('welcome')}! I'm here to help you with farming advice, weather updates, market prices, and government schemes. How can I assist you today?`,
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatMessage = async (message: Message) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: message.text,
          sender: message.sender,
          category: message.category || null,
          timestamp: message.timestamp.toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  const generateBotResponse = (userMessage: string, category?: string): string => {
    const message = userMessage.toLowerCase();
    
    // Check for data analysis requests
    if (message.includes('analyze') || message.includes('data') || message.includes('compare')) {
      return generateDataAnalysisResponse(userMessage);
    }
    
    // Enhanced response system based on keywords and context
    const responses = {
      // Crop-related responses
      crop: {
        keywords: ['crop', 'plant', 'seed', 'harvest', 'grow', 'maize', 'wheat', 'tomato', 'potato', 'vegetable'],
        responses: [
          "Based on the current season, I recommend planting drought-resistant crops like sorghum or millet. Make sure to prepare your soil with organic compost.",
          "For optimal crop growth, ensure proper spacing and regular watering. Consider companion planting to maximize your harvest.",
          "The best time to plant maize is early spring after the last frost. Ensure soil pH is between 6.0-6.8 for optimal growth.",
        ]
      },
      
      // Pest and disease responses
      pest: {
        keywords: ['pest', 'disease', 'insect', 'bug', 'aphid', 'fungus', 'rot', 'yellow', 'spot', 'wilt', 'blight'],
        responses: [
          "Common signs of pest infestation include yellowing leaves and visible insects. Try using neem oil as a natural pesticide.",
          "For fungal diseases, ensure good air circulation and avoid overhead watering. Copper-based fungicides can help control the spread.",
          "Integrated Pest Management (IPM) combines biological, cultural, and chemical controls for sustainable pest management.",
        ]
      },
      
      // Weather-related responses
      weather: {
        keywords: ['weather', 'rain', 'drought', 'temperature', 'frost', 'wind', 'storm', 'climate'],
        responses: [
          "Current weather shows 70% chance of rain in the next 3 days. Perfect time for planting! Make sure to have proper drainage.",
          "Temperature will drop to 15°C tonight. Consider covering sensitive plants to protect them from frost damage.",
          "Heavy rains expected next week. Prepare your fields for proper water management to prevent waterlogging.",
        ]
      },
      
      // Market and pricing responses
      market: {
        keywords: ['price', 'market', 'sell', 'buy', 'cost', 'profit', 'demand', 'supply', 'export'],
        responses: [
          "Current maize prices: R4,500/ton (up 5% from last week). Tomato prices: R18/kg (seasonal high). Good time to sell!",
          "Wheat prices are expected to rise due to increased demand. Consider holding your stock for better prices next month.",
          "Local market report: Potatoes R12/kg, Onions R15/kg, Cabbage R8/kg. Prices stable this week.",
        ]
      },
      
      // Livestock responses
      livestock: {
        keywords: ['cattle', 'cow', 'sheep', 'goat', 'chicken', 'pig', 'livestock', 'animal', 'feed', 'vaccination', 'breeding'],
        responses: [
          "For cattle health, ensure regular vaccinations against FMD, anthrax, and blackleg. Provide clean water and quality feed daily.",
          "Sheep require CDT vaccinations and regular deworming. Monitor for signs of foot rot, especially during wet seasons.",
          "Chicken health: Vaccinate against Newcastle disease and Marek's disease. Maintain clean coops and provide balanced feed for optimal egg production.",
          "Cattle breeding: Best breeding season is spring/early summer. Ensure proper nutrition 2-3 months before breeding for optimal conception rates.",
        ]
      },
      
      // Seasonal planting responses
      seasonal: {
        keywords: ['season', 'when', 'time', 'month', 'spring', 'summer', 'winter', 'autumn', 'calendar'],
        responses: [
          "For summer planting (December-February): Plant tomatoes, peppers, beans, and maize. Ensure adequate water supply during hot months.",
          "Autumn crops (March-May): Perfect time for planting spinach, lettuce, carrots, and onions. These cool-season crops thrive in mild temperatures.",
          "Winter preparation (June-August): Plant cabbage, broccoli, peas, and broad beans. These crops can withstand frost and cold conditions.",
          "Spring planting (September-November): Ideal for planting potatoes, sweet corn, pumpkins, and most vegetable crops as temperatures warm up.",
        ]
      },
      
      // Soil and fertilizer responses
      soil: {
        keywords: ['soil', 'fertilizer', 'compost', 'nitrogen', 'phosphorus', 'potassium', 'ph', 'nutrients'],
        responses: [
          "Test your soil pH regularly. Most crops prefer pH 6.0-7.0. Add lime to raise pH or sulfur to lower it.",
          "Organic compost improves soil structure and provides slow-release nutrients. Apply 2-3 tons per hectare annually.",
          "NPK fertilizer ratios: Use 3:2:1 for leafy vegetables, 1:2:1 for root crops, and 2:3:1 for fruiting plants.",
        ]
      },
      
      // Water management responses
      water: {
        keywords: ['water', 'irrigation', 'drought', 'flood', 'drainage', 'moisture', 'dry', 'wet'],
        responses: [
          "Drip irrigation saves 30-50% water compared to flood irrigation. Install timers for consistent watering schedules.",
          "During drought, mulch around plants to retain moisture and reduce evaporation. Use drought-resistant crop varieties.",
          "Poor drainage causes root rot. Create raised beds or install French drains in waterlogged areas.",
        ]
      },
      
      // Government schemes responses
      schemes: {
        keywords: ['government', 'grant', 'loan', 'funding', 'support', 'subsidy', 'program', 'application'],
        responses: [
          "The Smallholder Agricultural Support Programme offers up to R50,000 for small-scale farmers. Application deadline: March 31, 2024.",
          "Winter preparation (June-August): Plant brassicas (cabbage, broccoli), peas, and broad beans. These crops can handle light frost.",
          "Succession planting: Stagger plantings every 2-3 weeks for continuous harvest of fast-growing crops like lettuce and radishes.",
        ]
      },
      
      // Government schemes and support
      schemes: {
        keywords: ['government', 'scheme', 'funding', 'grant', 'loan', 'support', 'subsidy', 'application', 'program'],
        responses: [
          "Smallholder Agricultural Support Programme offers up to R50,000 for equipment and inputs. Application deadline: March 31. Contact: 012 319 7000.",
          "Youth in Agriculture Programme (18-35 years): Up to R100,000 for young farmers. Requires business plan and mentorship participation.",
          "Agricultural Development Fund provides loans at reduced interest rates. Covers 70% of project costs for qualifying farmers.",
          "Land Bank offers production loans, asset finance, and development finance. Visit your nearest branch or apply online at landbank.co.za.",
          "Provincial extension services provide free technical advice, training, and support. Contact your local Department of Agriculture office.",
        ]
      }
    };

    // Determine the most relevant category based on keywords
    let bestCategory = category || 'general';
    let maxMatches = 0;

    if (!category) {
      Object.entries(responses).forEach(([cat, data]) => {
        const matches = data.keywords.filter(keyword => message.includes(keyword)).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          bestCategory = cat;
        }
      });
    }

    // Get specific responses based on keywords within the category
    if (responses[bestCategory as keyof typeof responses]) {
      const categoryData = responses[bestCategory as keyof typeof responses];
      
      // Look for specific keyword matches to provide more targeted responses
      if (message.includes('yellow') && message.includes('leaves')) {
        return "Yellow leaves often indicate nitrogen deficiency, overwatering, or pest damage. Check soil moisture first - if waterlogged, improve drainage. If soil is dry, apply nitrogen fertilizer (LAN 28% at 150kg/ha). Also inspect for aphids or other pests on leaf undersides.";
      }
      
      if (message.includes('price') || message.includes('market')) {
        return "Current market prices (per kg): Maize R4.50, Wheat R6.20, Tomatoes R18, Potatoes R12, Onions R15. Prices vary by region and quality. For best prices, sell directly to local markets or restaurants. Consider value-adding through processing or packaging.";
      }
      
      if (message.includes('plant') && (message.includes('when') || message.includes('time'))) {
        return "Planting calendar for South Africa: Spring (Sep-Nov) - maize, beans, tomatoes; Summer (Dec-Feb) - maintenance and harvesting; Autumn (Mar-May) - spinach, lettuce, carrots; Winter (Jun-Aug) - cabbage, peas, broad beans. Always check local frost dates.";
      }
      
      if (message.includes('water') || message.includes('irrigation')) {
        return "Efficient watering: Deep, infrequent watering encourages strong roots. Water early morning (6-8 AM) to reduce evaporation. Use drip irrigation or soaker hoses for 50% water savings. Mulch around plants to retain moisture. Check soil moisture 5cm deep before watering.";
      }
      
      if (message.includes('pest') || message.includes('insect')) {
        return "Integrated pest management approach: 1) Monitor weekly for early detection, 2) Use beneficial insects like ladybugs, 3) Apply neem oil or soap spray for soft-bodied pests, 4) Remove infected plants immediately, 5) Use chemical pesticides only as last resort.";
      }
      
      if (message.includes('soil') || message.includes('fertilizer')) {
        return "Soil health is foundation of good farming. Test pH annually (ideal 6.0-7.0 for most crops). Add compost regularly to improve structure and nutrients. Use 2:3:2 fertilizer for general feeding, or specific NPK ratios based on soil test results. Avoid over-fertilizing - it can burn plants.";
      }
      
      if (message.includes('cattle') || message.includes('cow')) {
        return "Cattle management essentials: Provide 30-50L clean water daily, quality pasture or 2-3% body weight in hay, mineral supplements, and annual vaccinations (FMD, anthrax, blackleg). Monitor for signs of illness: loss of appetite, isolation, abnormal discharge, or lameness.";
      }
      
      if (message.includes('chicken') || message.includes('poultry')) {
        return "Chicken care: Provide 120g feed per bird daily, 14-16 hours light for egg production, 10cm feeder space per bird, clean water always available. Vaccinate against Newcastle disease and Marek's disease. Collect eggs twice daily and maintain clean coops.";
      }
      
      // Return a random response from the appropriate category
      const categoryResponses = categoryData.responses;
      return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
    }

    // Default responses for general queries
    const generalResponses = [
      "I can help you with crop advice, weather updates, pest control, and market information. What specific area would you like to explore?",
      "Remember to rotate your crops each season to maintain soil health and reduce pest buildup.",
      "Always keep records of your farming activities - planting dates, fertilizer applications, and harvest yields. This data helps improve future planning.",
    ];

    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  };

  const generateDataAnalysisResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Crop analysis requests
    if (message.includes('maize') || message.includes('corn')) {
      const analysis = getCropAnalysis('Maize');
      return `🌾 **MAIZE Analysis** (Based on real farm data):

📊 **Performance Metrics:**
• Average Yield: ${analysis.averageYield} tons/acre
• Best Irrigation: ${analysis.bestIrrigation}
• Optimal Soil: ${analysis.bestSoilType}
• Fertilizer Usage: ${analysis.averageFertilizer} tons
• Water Requirement: ${analysis.averageWaterUsage.toLocaleString()} m³

💡 **Key Recommendations:**
${analysis.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}

🎯 **Data Insight**: Farms using ${analysis.bestIrrigation.toLowerCase()} irrigation on ${analysis.bestSoilType.toLowerCase()} soil achieved the highest yields!`;
    }
    
    if (message.includes('tomato')) {
      const analysis = getCropAnalysis('Tomato');
      return `🍅 **TOMATO Analysis** (Based on real farm data):

📊 **Performance Metrics:**
• Average Yield: ${analysis.averageYield} tons/acre
• Best Irrigation: ${analysis.bestIrrigation}
• Optimal Soil: ${analysis.bestSoilType}
• Fertilizer Usage: ${analysis.averageFertilizer} tons
• Water Requirement: ${analysis.averageWaterUsage.toLocaleString()} m³

💡 **Key Recommendations:**
${analysis.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}`;
    }
    
    if (message.includes('rice')) {
      const analysis = getCropAnalysis('Rice');
      return `🌾 **RICE Analysis** (Based on real farm data):

📊 **Performance Metrics:**
• Average Yield: ${analysis.averageYield} tons/acre
• Best Irrigation: ${analysis.bestIrrigation}
• Optimal Soil: ${analysis.bestSoilType}
• Fertilizer Usage: ${analysis.averageFertilizer} tons
• Water Requirement: ${analysis.averageWaterUsage.toLocaleString()} m³

💡 **Key Recommendations:**
${analysis.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}`;
    }
    
    // Farming recommendations based on conditions
    if (message.includes('clay') && message.includes('drip')) {
      const recommendations = getFarmingRecommendations('Clay', 'Kharif', 'Drip');
      return `🎯 **Farming Recommendations** (Clay soil + Drip irrigation):

📋 **Top Crop Recommendations:**
${recommendations.slice(0, 3).map((rec, index) => 
  `${index + 1}. **${rec.cropType}**: ${rec.expectedYield} tons/acre expected
     • Fertilizer: ${rec.fertilizerRecommendation} tons
     • Water: ${rec.waterRequirement.toLocaleString()} m³
     • Confidence: ${rec.confidence}`
).join('\n\n')}

💡 **Pro Tip**: These recommendations are based on actual farm performance data from similar conditions.`;
    }
    
    return "I can analyze crop performance data for you! Try asking about specific crops like 'analyze maize yields' or 'compare tomato and rice performance'. I can also provide recommendations based on your soil type and irrigation method.";
  };
  const handleSendMessage = (text: string = inputText, category?: string) => {
    if (!text.trim()) return;

    // Show auth modal if user is not signed in
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
      category,
      attachment: attachedFile ? {
        name: attachedFile.name,
        type: attachedFile.type,
        size: attachedFile.size,
      } : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setAttachedFile(null);

    // Save user message to database
    saveChatMessage(userMessage);

    // Simulate bot response
    setTimeout(() => {
      let botResponseText: string;
      
      // Try to use Llama if available, otherwise fall back to rule-based responses
      if (llamaService.isServiceAvailable()) {
        llamaService.generateResponse(text, {
          category,
          farmData: parseAgricultureData().slice(0, 10),
          userPreferences: { location: 'South Africa', language: 'en' }
        }).then(response => {
          const llamaResponse: Message = {
            id: (Date.now() + 2).toString(),
            text: response.text,
            sender: 'bot',
            timestamp: new Date(),
            category,
          };
          setMessages((prev) => [...prev, llamaResponse]);
          saveChatMessage(llamaResponse);
        }).catch(error => {
          console.warn('Llama failed, using fallback response system');
          const fallbackResponse = generateBotResponse(text, category);
          const botResponse: Message = {
            id: (Date.now() + 2).toString(),
            text: fallbackResponse,
            sender: 'bot',
            timestamp: new Date(),
            category,
          };
          setMessages((prev) => [...prev, botResponse]);
          saveChatMessage(botResponse);
        });
        return; // Exit early for async Llama response
      }
      
      // Fallback to rule-based responses
      botResponseText = generateBotResponse(text, category);
      
      // Add specific response for PDF attachments
      if (userMessage.attachment) {
        botResponseText = `I can see you've attached a PDF document "${userMessage.attachment.name}". While I can't directly read PDF files yet, I can help you with any questions about the content you describe. Please tell me what specific information from the document you'd like help with, and I'll provide relevant farming advice.`;
      }
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date(),
        category,
      };
      setMessages((prev) => [...prev, botResponse]);
      
      // Save bot response to database
      saveChatMessage(botResponse);
    }, 800);
  };

  const handleQuickAction = (action: any) => {
    const questions = {
      crop: "What crops should I plant this season?",
      pest: "How can I identify and treat plant diseases?",
      weather: "What's the weather forecast for farming?",
      market: "What are the current market prices?",
      seasonal: "What should I plant this season?",
      livestock: "How can I improve my livestock management?",
    };
    
    handleSendMessage(questions[action.category as keyof typeof questions], action.category);
  };

  const handleVoiceInput = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser. Please try using Chrome or Edge.');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
        <h2 className="text-2xl font-bold text-white">{t('chatWithBot')}</h2>
        <p className="text-green-100 mt-2">Get instant advice for all your farming needs</p>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.category}
                onClick={() => handleQuickAction(action)}
                className="flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
              >
                <Icon size={20} className="text-green-600" />
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {/* Attachment display */}
              {message.attachment && (
                <div className={`mb-3 p-3 rounded-lg border ${
                  message.sender === 'user' 
                    ? 'bg-green-400 border-green-300' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className={message.sender === 'user' ? 'text-green-100' : 'text-gray-600'} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        message.sender === 'user' ? 'text-green-100' : 'text-gray-700'
                      }`}>
                        {message.attachment.name}
                      </p>
                      <p className={`text-xs ${
                        message.sender === 'user' ? 'text-green-200' : 'text-gray-500'
                      }`}>
                        PDF • {formatFileSize(message.attachment.size)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm leading-relaxed">{message.text}</p>
              <p className={`text-xs mt-2 ${
                message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        {/* Share to WhatsApp Button */}
        {messages.length > 2 && (
          <div className="mb-3 flex justify-end">
            <button
              onClick={shareToWhatsApp}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <MessageCircle size={16} />
              <span>Share to WhatsApp</span>
            </button>
          </div>
        )}
        
        {/* Llama Status Indicator */}
        {llamaService.isServiceAvailable() && (
          <div className="mb-3 flex items-center space-x-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>🦙 Llama AI Enhanced - Smarter responses enabled</span>
          </div>
        )}
        
        {/* Speech Recognition Status */}
        {isListening && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-700 font-medium">Listening... Speak now</span>
            </div>
            {transcript && (
              <p className="text-sm text-blue-600 mt-2 italic">"{transcript}"</p>
            )}
          </div>
        )}
        
        {/* Speech Error */}
        {speechError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              Speech recognition error: {speechError}. Please try again.
            </p>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {/* File attachment input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileAttachment}
            className="hidden"
          />
          
          <button
            onClick={handleVoiceInput}
            disabled={!speechSupported}
            className={`p-3 rounded-full transition-all duration-200 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : speechSupported
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
            title={
              !speechSupported 
                ? 'Speech recognition not supported' 
                : isListening 
                ? 'Stop listening' 
                : 'Start voice input'
            }
          >
            <Mic size={20} />
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Attach PDF document"
          >
            <Paperclip size={20} />
          </button>

          <button className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            <Camera size={20} />
          </button>

          <div className="flex-1 flex items-center space-x-2">
            {/* Show attached file preview */}
            {attachedFile && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <FileText size={16} className="text-blue-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-800 truncate">
                    {attachedFile.name}
                  </p>
                  <p className="text-xs text-blue-600">
                    {formatFileSize(attachedFile.size)}
                  </p>
                </div>
                <button
                  onClick={removeAttachment}
                  className="p-1 hover:bg-blue-100 rounded transition-colors"
                >
                  <X size={14} className="text-blue-600" />
                </button>
              </div>
            )}
            
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={attachedFile ? 'Add a message about your PDF...' : t('askQuestion')}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() && !attachedFile}
              className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center space-x-2"
            >
              <Send size={18} />
              <span className="hidden sm:inline">{t('send')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Widget */}
      <WhatsAppWidget />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};