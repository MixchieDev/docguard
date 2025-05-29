import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTransactions } from './storage';

export default function AllTransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, complete, incomplete

  const loadTransactions = async () => {
    const allTransactions = await getTransactions();
    setTransactions(allTransactions);
    filterTransactions(allTransactions, searchText, filterStatus);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const filterTransactions = (transactionList, search, status) => {
    let filtered = transactionList;

    // Filter by search text
    if (search) {
      filtered = filtered.filter(t => 
        t.vendor.toLowerCase().includes(search.toLowerCase()) ||
        t.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
        t.amount.toString().includes(search)
      );
    }

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }

    setFilteredTransactions(filtered);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    filterTransactions(transactions, text, filterStatus);
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    filterTransactions(transactions, searchText, status);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const getMissingDocsCount = (transaction) => {
    const docs = transaction.documents || {};
    let missing = 0;
    if (!docs.officialReceipt) missing++;
    if (!docs.invoice) missing++;
    if (!docs.form2307) missing++;
    return missing;
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by vendor, invoice, or amount..."
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>
            All ({transactions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'complete' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('complete')}
        >
          <Text style={[styles.filterText, filterStatus === 'complete' && styles.filterTextActive]}>
            Complete
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'incomplete' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('incomplete')}
        >
          <Text style={[styles.filterText, filterStatus === 'incomplete' && styles.filterTextActive]}>
            Incomplete
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchText ? 'No transactions found' : 'No transactions yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vendorName} numberOfLines={2}>
                      {transaction.vendor}
                    </Text>
                    <View style={styles.metaContainer}>
                      <Text style={styles.transactionType}>
                        {transaction.type === 'purchase' ? 'Purchase' : 'Sale'}
                      </Text>
                      <Text style={styles.date}>
                        {formatDate(transaction.transactionDate || transaction.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amount}>{formatAmount(transaction.amount)}</Text>
                    <View style={[
                      styles.statusBadge,
                      transaction.status === 'complete' ? styles.completeBadge : styles.incompleteBadge
                    ]}>
                      <Text style={[
                        styles.statusText,
                        transaction.status === 'complete' ? styles.completeText : styles.incompleteText
                      ]}>
                        {transaction.status === 'complete' ? 'Complete' : 'Incomplete'}
                      </Text>
                    </View>
                  </View>
                </View>

                {transaction.status === 'incomplete' && (
                  <View style={styles.missingInfo}>
                    <Text style={styles.missingText}>
                      Missing {getMissingDocsCount(transaction)} document(s)
                    </Text>
                  </View>
                )}

                {transaction.invoiceNumber && (
                  <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceText}>
                      Invoice/OR: {transaction.invoiceNumber}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#000000',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  transactionsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  transactionCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  transactionType: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completeBadge: {
    backgroundColor: '#d1fae5',
  },
  incompleteBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  completeText: {
    color: '#065f46',
  },
  incompleteText: {
    color: '#92400e',
  },
  missingInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  missingText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  invoiceInfo: {
    marginTop: 4,
  },
  invoiceText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});