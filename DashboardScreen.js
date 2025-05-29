import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getStats, getTransactions } from './storage';

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState({
    total: 0,
    complete: 0,
    incomplete: 0,
    missingDocs: [],
    readyForYTO: []
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const statsData = await getStats();
    const transactions = await getTransactions();
    setStats(statsData);
    setRecentTransactions(transactions.slice(0, 5)); // Show last 5
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}!</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>DocGuard Dashboard</Text>
          <TouchableOpacity 
            style={styles.allTransactionsButton}
            onPress={() => navigation.navigate('AllTransactions')}
          >
            <Text style={styles.allTransactionsButtonText}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={[styles.statCard, styles.warningCard]}>
          <Text style={styles.statNumber}>{stats.incomplete}</Text>
          <Text style={styles.statLabel}>Missing Docs</Text>
          <Text style={styles.statSubtext}>Need attention</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, styles.successCard]}>
          <Text style={styles.statNumber}>{stats.complete}</Text>
          <Text style={styles.statLabel}>Ready for YTO</Text>
          <Text style={styles.statSubtext}>Complete docs</Text>
        </TouchableOpacity>
      </View>

      {/* Missing Documents Section */}
      {stats.missingDocs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Missing Documents</Text>
          <View style={styles.missingList}>
            {stats.missingDocs.slice(0, 3).map((transaction) => (
              <TouchableOpacity key={transaction.id} style={styles.missingItem}>
                <View style={styles.missingItemHeader}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.vendorName} numberOfLines={2}>
                      {transaction.vendor}
                    </Text>
                  </View>
                  <Text style={styles.amount}>{formatAmount(transaction.amount)}</Text>
                </View>
                <View style={styles.missingItemFooter}>
                  <Text style={styles.missingDocs}>
                    Missing: {transaction.missingDocsList.join(', ')}
                  </Text>
                  <Text style={styles.date}>{formatDate(transaction.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {stats.missingDocs.length > 3 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Missing')}
            >
              <Text style={styles.viewAllText}>View all {stats.missingDocs.length} items</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {recentTransactions.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('AllTransactions')}
            >
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('Add')}
            >
              <Text style={styles.addButtonText}>Add your first transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.transactionList}>
            {recentTransactions.map((transaction) => (
              <TouchableOpacity 
                key={transaction.id} 
                style={styles.transactionItem}
                onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
              >
                <View style={styles.transactionHeader}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.transactionVendor} numberOfLines={2}>
                      {transaction.vendor}
                    </Text>
                  </View>
                  <Text style={styles.transactionAmount}>{formatAmount(transaction.amount)}</Text>
                </View>
                <View style={styles.transactionFooter}>
                  <View style={[
                    styles.statusBadge,
                    transaction.status === 'complete' ? styles.completeBadge : styles.incompleteBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      transaction.status === 'complete' ? styles.completeText : styles.incompleteText
                    ]}>
                      {transaction.status === 'complete' ? '✓ Complete' : '⚠️ Incomplete'}
                    </Text>
                  </View>
                  <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Add')}
        >
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={styles.actionText}>Snap Receipt</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { marginTop: 12 }]}
          onPress={() => navigation.navigate('AllTransactions')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>All Transactions</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
    flex: 1,
  },
  allTransactionsButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  allTransactionsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  warningCard: {
    backgroundColor: '#fef3c7',
  },
  successCard: {
    backgroundColor: '#d1fae5',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000000',
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  missingList: {
    paddingHorizontal: 24,
  },
  missingItem: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  missingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    flexWrap: 'wrap',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  missingItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  missingDocs: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  transactionList: {
    paddingHorizontal: 24,
  },
  transactionItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionVendor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    flexWrap: 'wrap',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeBadge: {
    backgroundColor: '#d1fae5',
  },
  incompleteBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completeText: {
    color: '#065f46',
  },
  incompleteText: {
    color: '#92400e',
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});