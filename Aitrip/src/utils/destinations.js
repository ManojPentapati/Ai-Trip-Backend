// Popular Indian cities + international destinations for autocomplete
export const DESTINATIONS = [
  // Andhra Pradesh
  'Tirupathi', 'Vizag', 'Vijayawada', 'Guntur', 'Nellore', 'Kakinada', 'Rajahmundry', 'Kurnool',
  // Telangana
  'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar',
  // Karnataka
  'Bangalore', 'Mysore', 'Hampi', 'Coorg', 'Mangalore', 'Gokarna', 'Badami', 'Chikmagalur',
  // Tamil Nadu
  'Chennai', 'Madurai', 'Ooty', 'Kodaikanal', 'Pondicherry', 'Coimbatore', 'Thanjavur', 'Rameswaram', 'Kanyakumari',
  // Kerala
  'Kochi', 'Thiruvananthapuram', 'Munnar', 'Alleppey', 'Wayanad', 'Kozhikode', 'Thrissur', 'Varkala',
  // Goa
  'Goa', 'Panaji', 'Calangute', 'Baga', 'Panjim',
  // Maharashtra
  'Mumbai', 'Pune', 'Nashik', 'Aurangabad', 'Lonavala', 'Mahabaleshwar', 'Shirdi', 'Kolhapur',
  // Rajasthan
  'Jaipur', 'Udaipur', 'Jodhpur', 'Jaisalmer', 'Pushkar', 'Ajmer', 'Bikaner', 'Ranthambore',
  // Delhi & NCR
  'New Delhi', 'Delhi', 'Agra', 'Mathura', 'Vrindavan',
  // Uttar Pradesh
  'Varanasi', 'Lucknow', 'Allahabad', 'Prayagraj', 'Ayodhya', 'Kanpur',
  // Madhya Pradesh
  'Bhopal', 'Indore', 'Jabalpur', 'Khajuraho', 'Ujjain', 'Pachmarhi', 'Orchha',
  // Gujarat
  'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Dwarka', 'Somnath', 'Gir', 'Kutch',
  // Himachal Pradesh
  'Shimla', 'Manali', 'Dharamsala', 'McLeod Ganj', 'Kasol', 'Spiti Valley', 'Kullu',
  // Uttarakhand
  'Dehradun', 'Rishikesh', 'Haridwar', 'Mussoorie', 'Nainital', 'Jim Corbett', 'Auli', 'Kedarnath',
  // Jammu & Kashmir
  'Srinagar', 'Gulmarg', 'Pahalgam', 'Leh', 'Ladakh', 'Jammu',
  // Punjab & Haryana
  'Amritsar', 'Chandigarh', 'Ludhiana',
  // West Bengal
  'Kolkata', 'Darjeeling', 'Siliguri', 'Sundarbans',
  // Odisha
  'Bhubaneswar', 'Puri', 'Konark',
  // Northeast
  'Guwahati', 'Shillong', 'Kaziranga', 'Gangtok', 'Sikkim', 'Aizawl', 'Imphal',
  // Andaman & Lakshadweep
  'Port Blair', 'Havelock Island', 'Neil Island', 'Lakshadweep',

  // International
  'Dubai', 'Singapore', 'Bangkok', 'Bali', 'Paris', 'London', 'New York', 'Tokyo', 'Rome',
  'Barcelona', 'Amsterdam', 'Maldives', 'Sri Lanka', 'Nepal', 'Bhutan', 'Switzerland',
  'Malaysia', 'Kuala Lumpur', 'Hong Kong', 'Sydney', 'Melbourne', 'Toronto', 'Istanbul',
  'Cairo', 'Cape Town', 'Nairobi', 'Rio de Janeiro', 'Buenos Aires', 'Mexico City',
  'Seoul', 'Beijing', 'Shanghai', 'Taipei', 'Ho Chi Minh City', 'Hanoi',
];

export const searchDestinations = (query, limit = 8) => {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return DESTINATIONS
    .filter(d => d.toLowerCase().includes(q))
    .sort((a, b) => {
      const ai = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bi = b.toLowerCase().startsWith(q) ? 0 : 1;
      return ai - bi || a.localeCompare(b);
    })
    .slice(0, limit);
};
