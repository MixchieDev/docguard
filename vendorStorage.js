import AsyncStorage from '@react-native-async-storage/async-storage';

const VENDORS_KEY = 'docguard_vendors';

export const saveVendor = async (vendorName, vendorData) => {
  try {
    const vendors = await getVendors();
    vendors[vendorName.toLowerCase()] = {
      ...vendors[vendorName.toLowerCase()],
      ...vendorData,
      lastUpdated: new Date().toISOString()
    };
    await AsyncStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
    console.log('Vendor saved:', vendorName, vendorData);
    return true;
  } catch (error) {
    console.error('Error saving vendor:', error);
    return false;
  }
};

export const getVendors = async () => {
  try {
    const data = await AsyncStorage.getItem(VENDORS_KEY);
    console.log('All vendors:', data);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting vendors:', error);
    return {};
  }
};

export const getVendor = async (vendorName) => {
  try {
    const vendors = await getVendors();
    const vendor = vendors[vendorName.toLowerCase()];
    console.log('Found vendor:', vendorName, vendor);
    return vendor || null;
  } catch (error) {
    console.error('Error getting vendor:', error);
    return null;
  }
};