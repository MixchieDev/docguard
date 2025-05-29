import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { getTransactions, updateTransaction } from './storage';

export default function TransactionDetailScreen({ route, navigation }) {
  const { transactionId } = route.params;
  const [transaction, setTransaction] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editedDocuments, setEditedDocuments] = useState({});

  useEffect(() => {
    loadTransaction();
  }, []);

  const loadTransaction = async () => {
    const transactions = await getTransactions();
    const found = transactions.find(t => t.id === transactionId);
    if (found) {
      setTransaction(found);
      setEditedDocuments(found.documents || {});
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const handleUpdateDocuments = async () => {
    try {
      // Check if all documents are complete
      const allComplete = editedDocuments.officialReceipt && 
                         editedDocuments.invoice && 
                         editedDocuments.form2307;
      
      await updateTransaction(transaction.id, {
        documents: editedDocuments,
        status: allComplete ? 'complete' : 'incomplete'
      });
      
      Alert.alert('Success', 'Documents updated successfully');
      setIsEditing(false);
      loadTransaction(); // Reload to get updated data
    } catch (error) {
      Alert.alert('Error', 'Failed to update documents');
    }
  };

  if (!transaction) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.vendorName}>{transaction.vendor}</Text>
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
        <Text style={styles.amount}>{formatAmount(transaction.amount)}</Text>
      </View>

      {/* Receipt Image */}
      {transaction.receiptImage && (
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={() => setShowImageModal(true)}
        >
          <Image
            source={{ uri: transaction.receiptImage }}
            style={styles.receiptThumbnail}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayText}>Tap to view full receipt</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Transaction Details */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Transaction Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>
            {transaction.type === 'purchase' ? 'Purchase' : 'Sale'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>
            {formatDate(transaction.transactionDate || transaction.createdAt)}
          </Text>
        </View>

        {transaction.invoiceNumber && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice/OR No.</Text>
            <Text style={styles.detailValue}>{transaction.invoiceNumber}</Text>
          </View>
        )}

        {transaction.vendorTIN && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vendor TIN</Text>
            <Text style={styles.detailValue}>{transaction.vendorTIN}</Text>
          </View>
        )}

        {transaction.expenseAccount && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expense Account</Text>
            <Text style={styles.detailValue}>{transaction.expenseAccount}</Text>
          </View>
        )}

        {transaction.remarks && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Remarks</Text>
            <Text style={styles.detailValue}>{transaction.remarks}</Text>
          </View>
        )}
      </View>

      {/* VAT Details */}
      {transaction.vatDetails && (
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>VAT & Tax Details</Text>
          
          {transaction.vatDetails.vatableSales > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VATable Sales</Text>
              <Text style={styles.detailValue}>
                {formatAmount(transaction.vatDetails.vatableSales)}
              </Text>
            </View>
          )}

          {transaction.vatDetails.vatAmount > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VAT Amount (12%)</Text>
              <Text style={styles.detailValue}>
                {formatAmount(transaction.vatDetails.vatAmount)}
              </Text>
            </View>
          )}

          {transaction.vatDetails.vatExemptSales > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VAT-Exempt Sales</Text>
              <Text style={styles.detailValue}>
                {formatAmount(transaction.vatDetails.vatExemptSales)}
              </Text>
            </View>
          )}

          {transaction.vatDetails.withholdingTax > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Withholding Tax ({transaction.vatDetails.withholdingRate}%)</Text>
              <Text style={styles.detailValue}>
                {formatAmount(transaction.vatDetails.withholdingTax)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Documents Section */}
      <View style={styles.detailsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Documents Checklist</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.documentsContainer}>
          {['officialReceipt', 'invoice', 'form2307', 'deliveryReceipt'].map((doc) => (
            <TouchableOpacity
              key={doc}
              style={styles.documentItem}
              onPress={() => {
                if (isEditing) {
                  setEditedDocuments(prev => ({
                    ...prev,
                    [doc]: !prev[doc]
                  }));
                }
              }}
              disabled={!isEditing}
            >
              <View style={[
                styles.checkbox,
                (isEditing ? editedDocuments[doc] : transaction.documents[doc]) && styles.checkboxChecked
              ]}>
                {(isEditing ? editedDocuments[doc] : transaction.documents[doc]) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.documentLabel}>
                {doc === 'officialReceipt' ? 'Official Receipt' :
                 doc === 'invoice' ? 'Invoice' :
                 doc === 'form2307' ? 'Form 2307' : 'Delivery Receipt'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isEditing && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleUpdateDocuments}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImageModal(false)}
        >
          <View style={styles.modalContent}>
            <Image
              source={{ uri: transaction.receiptImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#f9fafb',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  vendorName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completeBadge: {
    backgroundColor: '#d1fae5',
  },
  incompleteBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  completeText: {
    color: '#065f46',
  },
  incompleteText: {
    color: '#92400e',
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
  },
  imageContainer: {
    margin: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  receiptThumbnail: {
    width: '100%',
    height: 200,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  imageOverlayText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
  },
  detailsSection: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  documentsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  documentLabel: {
    fontSize: 16,
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#000000',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '90%',
  },
  closeButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});