import AsyncStorage from '@react-native-async-storage/async-storage';

const TRANSACTIONS_KEY = 'docguard_transactions';

export const saveTransaction = async (transaction) => {
  try {
    // Get existing transactions
    const existingData = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    const transactions = existingData ? JSON.parse(existingData) : [];
    
    // Add new transaction with ID
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    transactions.unshift(newTransaction); // Add to beginning
    
    // Save back to storage
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    
    return newTransaction;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
};

export const getTransactions = async () => {
  try {
    const data = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
};

export const updateTransaction = async (id, updates) => {
  try {
    const transactions = await getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updates };
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      return transactions[index];
    }
    
    throw new Error('Transaction not found');
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    const transactions = await getTransactions();
    
    const stats = {
      total: transactions.length,
      complete: 0,
      incomplete: 0,
      missingDocs: [],
      readyForYTO: []
    };
    
    transactions.forEach(transaction => {
      if (transaction.status === 'complete') {
        stats.complete++;
        stats.readyForYTO.push(transaction);
      } else {
        stats.incomplete++;
        
        // Check which docs are missing
        const missing = [];
        if (!transaction.documents.officialReceipt) missing.push('OR');
        if (!transaction.documents.invoice) missing.push('Invoice');
        if (!transaction.documents.form2307) missing.push('2307');
        
        if (missing.length > 0) {
          stats.missingDocs.push({
            ...transaction,
            missingDocsList: missing
          });
        }
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      total: 0,
      complete: 0,
      incomplete: 0,
      missingDocs: [],
      readyForYTO: []
    };
  }
};