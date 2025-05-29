import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Linking,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getStats, updateTransaction } from './storage';

export default function MissingDocsScreen({ navigation }) {
  const [missingDocs, setMissingDocs] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [reminderModal, setReminderModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    loadMissingDocs();
  }, []);

  const loadMissingDocs = async () => {
    const stats = await getStats();
    setMissingDocs(stats.missingDocs);
  };

  const formatAmount = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-PH', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDefaultMessage = (transaction) => {
    const missing = transaction.missingDocsList.join(', ');
    return `Hi! This is a friendly reminder that we're still waiting for the following documents for your transaction worth ${formatAmount(transaction.amount)}:\n\n${missing}\n\nPlease send them at your earliest convenience. Thank you!`;
  };

  const openReminderModal = (transaction) => {
    setSelectedTransaction(transaction);
    setCustomMessage(getDefaultMessage(transaction));
    setPhoneNumber(''); // You might want to store client phone numbers
    setReminderModal(true);
  };

  const sendSMS = () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    const message = encodeURIComponent(customMessage);
    const url = `sms:${phoneNumber}?body=${message}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open SMS app');
    });
    
    setReminderModal(false);
  };

  const sendEmail = () => {
    const subject = encodeURIComponent('Missing Documents Reminder');
    const body = encodeURIComponent(customMessage);
    const url = `mailto:?subject=${subject}&body=${body}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open email app');
    });
    
    setReminderModal(false);
  };

  const markAsComplete = async (transaction) => {
    Alert.alert(
      'Mark as Complete?',
      'Have you received all the missing documents?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Mark Complete', 
          onPress: async () => {
            try {
              // Update all documents as received
              const updatedDocs = {
                officialReceipt: true,
                invoice: true,
                form2307: true,
                deliveryReceipt: transaction.documents.deliveryReceipt
              };
              
              await updateTransaction(transaction.id, {
                documents: updatedDocs,
                status: 'complete'
              });
              
              Alert.alert('Success', 'Transaction marked as complete');
              loadMissingDocs(); // Reload the list
            } catch (error) {
              Alert.alert('Error', 'Failed to update transaction');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Missing Documents</Text>
          <Text style={styles.subtitle}>
            {missingDocs.length} transaction{missingDocs.length !== 1 ? 's' : ''} need attention
          </Text>
        </View>

        {missingDocs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>No missing documents</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {missingDocs.map((transaction) => (
              <TouchableOpacity 
                key={transaction.id} 
                style={styles.card}
                onPress={() => navigation.navigate('Dashboard', {
                  screen: 'TransactionDetail',
                  params: { transactionId: transaction.id }
                })}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.vendor} numberOfLines={2}>
                      {transaction.vendor}
                    </Text>
                    <Text style={styles.amount}>{formatAmount(transaction.amount)}</Text>
                  </View>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeAgo}>{formatDate(transaction.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.missingSection}>
                  <Text style={styles.missingLabel}>Missing Documents:</Text>
                  <View style={styles.missingList}>
                    {transaction.missingDocsList.map((doc, index) => (
                      <View key={index} style={styles.missingBadge}>
                        <Text style={styles.missingBadgeText}>{doc}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.reminderButton}
                    onPress={() => openReminderModal(transaction)}
                  >
                    <Text style={styles.reminderButtonText}>📤 Send Reminder</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.completeButton}
                    onPress={() => markAsComplete(transaction)}
                  >
                    <Text style={styles.completeButtonText}>✓ Mark Complete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reminder Modal */}
      <Modal
        visible={reminderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReminderModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardView}
            >
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Send Reminder</Text>
                  
                  <Text style={styles.inputLabel}>Phone Number (for SMS)</Text>
                  <TextInput
                    style={styles.input}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="+63 9XX XXX XXXX"
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <Text style={styles.inputLabel}>Message</Text>
                  <TextInput
                    style={[styles.input, styles.messageInput]}
                    value={customMessage}
                    onChangeText={setCustomMessage}
                    multiline
                    numberOfLines={6}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={styles.sendButton}
                      onPress={sendSMS}
                    >
                      <Text style={styles.sendButtonText}>Send SMS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.sendButton, styles.emailButton]}
                      onPress={sendEmail}
                    >
                      <Text style={styles.sendButtonText}>Send Email</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => setReminderModal(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vendor: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    flexWrap: 'wrap',
  },
  amount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 4,
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timeAgo: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  missingSection: {
    marginBottom: 16,
  },
  missingLabel: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 8,
  },
  missingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  missingBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  missingBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  reminderButton: {
    flex: 1,
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reminderButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  completeButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 12,
  },
  sendButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emailButton: {
    backgroundColor: '#4b5563',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});