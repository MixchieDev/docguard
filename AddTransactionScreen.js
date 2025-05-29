import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { saveTransaction } from './storage';
import { analyzeReceipt } from './apiService';
import { saveVendor, getVendor } from './vendorStorage';

export default function AddTransactionScreen({ navigation }) {
  const [transactionType, setTransactionType] = useState('purchase');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [documents, setDocuments] = useState({
    officialReceipt: false,
    invoice: false,
    form2307: false,
    deliveryReceipt: false
  });
  const [receiptImage, setReceiptImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expenseAccount, setExpenseAccount] = useState('');
  const [showAccountSuggestions, setShowAccountSuggestions] = useState(false);
  
  // Additional transaction fields
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendorTIN, setVendorTIN] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // New VAT-related fields
  const [showVatDetails, setShowVatDetails] = useState(false);
  const [vatDetails, setVatDetails] = useState({
    vatableSales: '',
    vatExemptSales: '',
    zeroRatedSales: '',
    vatAmount: '',
    discount: '',
    otherCharges: '',
    withholdingTax: '',
    withholdingRate: '2' // Default 2%
  });

  // Common expense accounts in Philippines
  const expenseAccounts = [
    { code: '5010', name: 'Purchases', keywords: ['goods', 'inventory', 'merchandise'] },
    { code: '5020', name: 'Direct Materials', keywords: ['materials', 'raw materials'] },
    { code: '5030', name: 'Freight-In', keywords: ['freight', 'shipping', 'delivery fee'] },
    { code: '6010', name: 'Salaries and Wages', keywords: ['salary', 'wages', 'payroll'] },
    { code: '6020', name: 'Employee Benefits', keywords: ['sss', 'philhealth', 'pagibig', '13th month'] },
    { code: '6030', name: 'Professional Fees', keywords: ['legal', 'accounting', 'consultant', 'professional'] },
    { code: '6040', name: 'Rent Expense', keywords: ['rent', 'lease', 'rental'] },
    { code: '6045', name: 'Condominium Dues', keywords: ['condo dues', 'association dues', 'condo', 'dmci', 'ayala', 'megaworld'] },
    { code: '6050', name: 'Utilities', keywords: ['electricity', 'water', 'meralco', 'maynilad', 'pldt', 'globe'] },
    { code: '6060', name: 'Repairs and Maintenance', keywords: ['repair', 'maintenance', 'fix', 'paint'] },
    { code: '6065', name: 'Cleaning Services', keywords: ['cleaning', 'janitorial', 'housekeeping', 'sanitation'] },
    { code: '6070', name: 'Supplies Expense', keywords: ['supplies', 'office supplies', 'stationery'] },
    { code: '6075', name: 'Groceries and Pantry', keywords: ['grocery', 'groceries', 'sm supermarket', 'robinsons', 'puregold', 'coffee', 'pantry', 'snacks'] },
    { code: '6080', name: 'Fuel and Oil', keywords: ['gas', 'gasoline', 'diesel', 'petron', 'shell'] },
    { code: '6090', name: 'Transportation and Travel', keywords: ['travel', 'transportation', 'grab', 'uber'] },
    { code: '6095', name: 'Delivery Services', keywords: ['delivery', 'courier', 'lbc', 'jrs', '2go', 'lalamove', 'grab express', 'shipping'] },
    { code: '6100', name: 'Communication', keywords: ['phone', 'internet', 'communication', 'mobile'] },
    { code: '6110', name: 'Advertising and Promotion', keywords: ['advertising', 'marketing', 'promotion', 'ads'] },
    { code: '6120', name: 'Meals and Entertainment', keywords: ['meals', 'food', 'restaurant', 'entertainment'] },
    { code: '6125', name: 'Memberships and Subscriptions', keywords: ['membership', 'subscription', 'dues', 'club', 'association', 'spotify', 'netflix', 'software'] },
    { code: '6130', name: 'Insurance', keywords: ['insurance', 'premium'] },
    { code: '6140', name: 'Taxes and Licenses', keywords: ['tax', 'license', 'permit', 'registration'] },
    { code: '6150', name: 'Depreciation', keywords: ['depreciation'] },
    { code: '6160', name: 'Miscellaneous', keywords: ['miscellaneous', 'others', 'other'] }
  ];

  const suggestExpenseAccount = (vendorName, items) => {
    const searchText = `${vendorName} ${items}`.toLowerCase();
    
    for (const account of expenseAccounts) {
      for (const keyword of account.keywords) {
        if (searchText.includes(keyword)) {
          return `${account.code} - ${account.name}`;
        }
      }
    }
    
    // Default suggestions based on vendor patterns
    if (vendorName.toLowerCase().includes('hardware')) return '6060 - Repairs and Maintenance';
    if (vendorName.toLowerCase().includes('supplies')) return '6070 - Supplies Expense';
    if (vendorName.toLowerCase().includes('restaurant') || vendorName.toLowerCase().includes('food')) return '6120 - Meals and Entertainment';
    if (vendorName.toLowerCase().includes('supermarket') || vendorName.toLowerCase().includes('grocery')) return '6075 - Groceries and Pantry';
    if (vendorName.toLowerCase().includes('lbc') || vendorName.toLowerCase().includes('2go') || vendorName.toLowerCase().includes('lalamove')) return '6095 - Delivery Services';
    if (vendorName.toLowerCase().includes('condo') || vendorName.toLowerCase().includes('property management')) return '6045 - Condominium Dues';
    if (vendorName.toLowerCase().includes('cleaning') || vendorName.toLowerCase().includes('janitorial')) return '6065 - Cleaning Services';
    
    return '';
  };

  // Calculate values when amount changes
  const calculateVatDetails = (totalAmount) => {
    const total = parseFloat(totalAmount) || 0;
    if (total > 0) {
      // If no VAT exempt sales, assume all is vatable
      const vatExempt = parseFloat(vatDetails.vatExemptSales) || 0;
      const otherCharges = parseFloat(vatDetails.otherCharges) || 0;
      
      // Calculate VATable sales (Total - VAT Exempt - Other Charges) / 1.12
      const vatableSalesWithVat = total - vatExempt - otherCharges;
      const vatableSales = (vatableSalesWithVat / 1.12).toFixed(2);
      const vatAmount = (vatableSalesWithVat - vatableSales).toFixed(2);
      
      setVatDetails(prev => ({
        ...prev,
        vatableSales: vatableSales,
        vatAmount: vatAmount
      }));
    }
  };

  const handleAmountChange = (value) => {
    setAmount(value);
    if (showVatDetails) {
      calculateVatDetails(value);
    }
  };

  // Auto-fill vendor data when vendor name changes
  const handleVendorChange = async (name) => {
    setVendor(name);
    console.log('Vendor changed to:', name);
    
    // Try to get saved vendor data
    if (name.length > 2) {
      const vendorData = await getVendor(name);
      console.log('Found vendor data:', vendorData);
      
      if (vendorData) {
        // Auto-fill TIN and expense account if we have them
        if (vendorData.tin) {
          console.log('Setting TIN to:', vendorData.tin);
          setVendorTIN(vendorData.tin);
        }
        if (vendorData.defaultExpenseAccount && !expenseAccount) {
          setExpenseAccount(vendorData.defaultExpenseAccount);
        }
      }
    }
  };

  const calculateWithholding = () => {
    // Calculate based on total vatable and vat-exempt sales
    const vatable = parseFloat(vatDetails.vatableSales) || 0;
    const vatExempt = parseFloat(vatDetails.vatExemptSales) || 0;
    const zeroRated = parseFloat(vatDetails.zeroRatedSales) || 0;
    const totalBase = vatable + vatExempt + zeroRated;
    
    const rate = parseFloat(vatDetails.withholdingRate) || 0;
    const withholding = (totalBase * (rate / 100)).toFixed(2);
    setVatDetails(prev => ({
      ...prev,
      withholdingTax: withholding
    }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptImage(result.assets[0].uri);
      
      // Analyze with AI
      setIsAnalyzing(true);
      Alert.alert('Analyzing', 'AI is reading your receipt...');
      
      try {
        const analysis = await analyzeReceipt(result.assets[0].uri);
        
        if (analysis.success && analysis.data) {
          // Auto-fill form with AI results
          setVendor(analysis.data.vendor || '');
          setAmount(analysis.data.amount?.toString() || '');
          
          // Fill additional fields if detected
          if (analysis.data.date) {
            setTransactionDate(analysis.data.date);
          }
          if (analysis.data.referenceNumber) {
            setInvoiceNumber(analysis.data.referenceNumber);
          }
          if (analysis.data.vendorTIN) {
            setVendorTIN(analysis.data.vendorTIN);
            console.log('TIN detected:', analysis.data.vendorTIN);
          } else {
            console.log('No TIN detected in AI response');
            console.log('Full AI response:', JSON.stringify(analysis.data, null, 2));
          }
          if (!analysis.data.vendorTIN && analysis.data.rawText) {
            const tinMatch = analysis.data.rawText.match(/TIN[:\s]*(\d{3}-\d{3}-\d{3}-\d{5}|\d{3}-\d{3}-\d{3}-\d{3})/i);
            if (tinMatch) {
              setVendorTIN(tinMatch[1]);
              console.log('Extracted TIN from rawText:', tinMatch[1]);
            }
          }
          
          // Suggest expense account based on vendor and items
          const suggestedAccount = suggestExpenseAccount(
            analysis.data.vendor || '', 
            analysis.data.items || ''
          );
          if (suggestedAccount) {
            setExpenseAccount(suggestedAccount);
          }
          
          // If AI detected VAT details, fill them
          if (analysis.data.vatableSales || analysis.data.vatExemptSales) {
            setShowVatDetails(true);
            setVatDetails(prev => ({
              ...prev,
              vatableSales: analysis.data.vatableSales?.toString() || '',
              vatExemptSales: analysis.data.vatExemptSales?.toString() || '0',
              zeroRatedSales: analysis.data.zeroRatedSales?.toString() || '0',
              vatAmount: analysis.data.vatAmount?.toString() || '',
              discount: analysis.data.discount?.toString() || '0',
              otherCharges: analysis.data.otherCharges?.toString() || '0'
            }));
          } else if (analysis.data.amount) {
            // Calculate VAT from total if not detected
            calculateVatDetails(analysis.data.amount);
          }
          
          // Auto-check document type based on receipt type
          if (analysis.data.receiptType === 'Official Receipt') {
            setDocuments(prev => ({ ...prev, officialReceipt: true }));
          } else if (analysis.data.receiptType === 'Sales Invoice') {
            setDocuments(prev => ({ ...prev, invoice: true }));
          }
          
          // If handwritten or low confidence, show detailed verification
          if (analysis.data.isHandwritten || analysis.data.confidence < 70) {
            let verifyMessage = `Please verify these details:\n\n`;
            verifyMessage += `Vendor: ${analysis.data.vendor || 'Not detected'}\n`;
            verifyMessage += `Amount: ₱${analysis.data.amount || 'Not detected'}\n`;
            verifyMessage += `Date: ${analysis.data.date || 'Not detected'}\n`;
            verifyMessage += `OR/Invoice: ${analysis.data.referenceNumber || 'Not detected'}\n`;
            
            if (analysis.data.handwritingNotes) {
              verifyMessage += `\nNote: ${analysis.data.handwritingNotes}`;
            }
            
            Alert.alert(
              'Handwritten Receipt - Please Verify', 
              verifyMessage,
              [
                { 
                  text: 'Edit Values', 
                  onPress: () => {
                    // User can manually edit the pre-filled values
                  }
                },
                { text: 'Looks Good', style: 'cancel' }
              ]
            );
          } else {
            Alert.alert(
              'AI Analysis Complete!', 
              `Found: ${analysis.data.vendor}\nAmount: ₱${analysis.data.amount}\nConfidence: ${analysis.data.confidence}%`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert('Analysis Failed', 'Could not read receipt. Please enter manually.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to connect to AI service');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleSave = () => {
    if (!vendor || !amount) {
      Alert.alert('Missing Info', 'Please fill in vendor and amount');
      return;
    }

    const missingDocs = [];
    if (!documents.officialReceipt) missingDocs.push('Official Receipt');
    if (!documents.invoice) missingDocs.push('Invoice');
    if (!documents.form2307) missingDocs.push('Form 2307');

    if (missingDocs.length > 0) {
      Alert.alert(
        'Missing Documents',
        `Still need: ${missingDocs.join(', ')}`,
        [
          { text: 'Save Anyway', onPress: () => saveTransactionHandler('incomplete') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      saveTransactionHandler('complete');
    }
  };

  const saveTransactionHandler = async (status) => {
    const transaction = {
      type: transactionType,
      vendor,
      amount: parseFloat(amount),
      expenseAccount,
      transactionDate,
      vendorTIN,
      invoiceNumber,
      remarks,
      documents,
      status,
      receiptImage,
      // Include VAT details
      vatDetails: showVatDetails ? {
        vatableSales: parseFloat(vatDetails.vatableSales) || 0,
        vatExemptSales: parseFloat(vatDetails.vatExemptSales) || 0,
        zeroRatedSales: parseFloat(vatDetails.zeroRatedSales) || 0,
        vatAmount: parseFloat(vatDetails.vatAmount) || 0,
        discount: parseFloat(vatDetails.discount) || 0,
        otherCharges: parseFloat(vatDetails.otherCharges) || 0,
        withholdingTax: parseFloat(vatDetails.withholdingTax) || 0,
        withholdingRate: vatDetails.withholdingRate
      } : null
    };
    
    try {
      await saveTransaction(transaction);
      
      // Save vendor data for future use
      if (vendor && vendorTIN) {
        console.log('Saving vendor:', vendor, 'with TIN:', vendorTIN);
        await saveVendor(vendor, {
          displayName: vendor,
          tin: vendorTIN,
          defaultExpenseAccount: expenseAccount
        });
      }
      
      Alert.alert('Success', `Transaction saved as ${status}`, [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
      ]);
      
      // Reset form
      setVendor('');
      setAmount('');
      setExpenseAccount('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setVendorTIN('');
      setInvoiceNumber('');
      setRemarks('');
      setDocuments({
        officialReceipt: false,
        invoice: false,
        form2307: false,
        deliveryReceipt: false
      });
      setReceiptImage(null);
      setShowVatDetails(false);
      setVatDetails({
        vatableSales: '',
        vatExemptSales: '',
        zeroRatedSales: '',
        vatAmount: '',
        discount: '',
        otherCharges: '',
        withholdingTax: '',
        withholdingRate: '2'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction');
    }
  };

  const toggleDocument = (doc) => {
    setDocuments(prev => ({
      ...prev,
      [doc]: !prev[doc]
    }));
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Transaction</Text>
        </View>

        {/* Camera Button */}
        <TouchableOpacity 
          style={[styles.cameraButton, isAnalyzing && styles.cameraButtonDisabled]} 
          onPress={pickImage}
          disabled={isAnalyzing}
        >
          <Text style={styles.cameraIcon}>{isAnalyzing ? '⏳' : '📷'}</Text>
          <Text style={styles.cameraButtonText}>
            {isAnalyzing ? 'Analyzing...' : receiptImage ? 'Retake Receipt' : 'Snap Receipt'}
          </Text>
        </TouchableOpacity>
        {receiptImage && (
          <Text style={styles.imageStatus}>✓ Receipt captured</Text>
        )}

        {/* Transaction Type Pills */}
        <View style={styles.pillContainer}>
          <TouchableOpacity
            style={[
              styles.pill,
              transactionType === 'purchase' && styles.pillActive
            ]}
            onPress={() => setTransactionType('purchase')}
          >
            <Text style={[
              styles.pillText,
              transactionType === 'purchase' && styles.pillTextActive
            ]}>Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pill,
              transactionType === 'sale' && styles.pillActive
            ]}
            onPress={() => setTransactionType('sale')}
          >
            <Text style={[
              styles.pillText,
              transactionType === 'sale' && styles.pillTextActive
            ]}>Sale</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Vendor/Client */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {transactionType === 'purchase' ? 'Vendor' : 'Client'}
            </Text>
            <TextInput
              style={styles.input}
              value={vendor}
              onChangeText={handleVendorChange}
              placeholder={`Enter ${transactionType === 'purchase' ? 'vendor' : 'client'} name`}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Total Amount (VAT Inclusive)</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Expense Account - Only for Purchases */}
          {transactionType === 'purchase' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Expense Account</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowAccountSuggestions(!showAccountSuggestions)}
              >
                <Text style={[styles.inputText, !expenseAccount && styles.placeholderText]}>
                  {expenseAccount || 'Select expense account'}
                </Text>
              </TouchableOpacity>
              
              {showAccountSuggestions && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView style={styles.suggestionsList} nestedScrollEnabled={true}>
                    {expenseAccounts.map((account) => (
                      <TouchableOpacity
                        key={account.code}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setExpenseAccount(`${account.code} - ${account.name}`);
                          setShowAccountSuggestions(false);
                        }}
                      >
                        <Text style={styles.suggestionCode}>{account.code}</Text>
                        <Text style={styles.suggestionName}>{account.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Transaction Details Row 1 - Date and Invoice */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Transaction Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text style={styles.inputText}>{transactionDate}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Invoice/OR No.</Text>
              <TextInput
                style={styles.input}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder="OR-123456"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <TextInput
                style={styles.input}
                value={transactionDate}
                onChangeText={setTransactionDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  setTransactionDate(new Date().toISOString().split('T')[0]);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Transaction Details Row 2 - TIN */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vendor TIN</Text>
            <TextInput
              style={styles.input}
              value={vendorTIN}
              onChangeText={setVendorTIN}
              placeholder="000-000-000-000"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={15}
            />
            <Text style={styles.inputHint}>Tax Identification Number (optional)</Text>
          </View>

          {/* Remarks */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Remarks</Text>
            <TextInput
              style={[styles.input, styles.remarksInput]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Add any notes about this transaction..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* VAT Details Toggle */}
          <TouchableOpacity 
            style={styles.vatToggle}
            onPress={() => {
              setShowVatDetails(!showVatDetails);
              if (!showVatDetails && amount) {
                calculateVatDetails(amount);
              }
            }}
          >
            <Text style={styles.vatToggleText}>
              {showVatDetails ? '▼' : '▶'} VAT & Tax Details
            </Text>
          </TouchableOpacity>

          {/* VAT Details Section */}
          {showVatDetails && (
            <View style={styles.vatDetailsContainer}>
              {/* Sales Breakdown */}
              <Text style={styles.vatSectionTitle}>Sales Breakdown</Text>
              
              <View style={styles.vatRow}>
                <View style={[styles.vatInputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.vatLabel}>VATable Sales</Text>
                  <TextInput
                    style={styles.vatInput}
                    value={vatDetails.vatableSales}
                    onChangeText={(value) => setVatDetails(prev => ({ ...prev, vatableSales: value }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.vatInputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.vatLabel}>VAT Amount (12%)</Text>
                  <TextInput
                    style={styles.vatInput}
                    value={vatDetails.vatAmount}
                    onChangeText={(value) => setVatDetails(prev => ({ ...prev, vatAmount: value }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.vatRow}>
                <View style={[styles.vatInputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.vatLabel}>VAT-Exempt Sales</Text>
                  <TextInput
                    style={styles.vatInput}
                    value={vatDetails.vatExemptSales}
                    onChangeText={(value) => setVatDetails(prev => ({ ...prev, vatExemptSales: value }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.vatInputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.vatLabel}>Zero-Rated Sales</Text>
                  <TextInput
                    style={styles.vatInput}
                    value={vatDetails.zeroRatedSales}
                    onChangeText={(value) => setVatDetails(prev => ({ ...prev, zeroRatedSales: value }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Other Charges & Deductions */}
              <Text style={[styles.vatSectionTitle, { marginTop: 16 }]}>Other Charges & Deductions</Text>
              
              <View style={styles.vatRow}>
                <View style={[styles.vatInputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.vatLabel}>Discount</Text>
                  <TextInput
                    style={styles.vatInput}
                    value={vatDetails.discount}
                    onChangeText={(value) => setVatDetails(prev => ({ ...prev, discount: value }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.vatInputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.vatLabel}>Other Charges</Text>
                  <TextInput
                    style={styles.vatInput}
                    value={vatDetails.otherCharges}
                    onChangeText={(value) => setVatDetails(prev => ({ ...prev, otherCharges: value }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Withholding Tax */}
              <Text style={[styles.vatSectionTitle, { marginTop: 16 }]}>Withholding Tax</Text>
              
              <View style={styles.vatRow}>
                <View style={[styles.vatInputGroup, { flex: 2, marginRight: 8 }]}>
                  <Text style={styles.vatLabel}>Withholding Tax Amount</Text>
                  <TextInput
                    style={styles.vatInput}
                    value={vatDetails.withholdingTax}
                    onChangeText={(value) => setVatDetails(prev => ({ ...prev, withholdingTax: value }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Withholding Rate Selector */}
              <View style={styles.rateContainer}>
                <Text style={styles.vatLabel}>Withholding Rate</Text>
                <View style={styles.rateButtons}>
                  {['1', '2', '5', '10', '15'].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.rateButton,
                        vatDetails.withholdingRate === rate && styles.rateButtonActive
                      ]}
                      onPress={() => {
                        setVatDetails(prev => ({ ...prev, withholdingRate: rate }));
                      }}
                    >
                      <Text style={[
                        styles.rateButtonText,
                        vatDetails.withholdingRate === rate && styles.rateButtonTextActive
                      ]}>{rate}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.calculateButton}
                onPress={calculateWithholding}
              >
                <Text style={styles.calculateButtonText}>Calculate Withholding Tax</Text>
              </TouchableOpacity>

              {/* Summary */}
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>
                  Total Net Sales: ₱{
                    (
                      parseFloat(vatDetails.vatableSales || 0) + 
                      parseFloat(vatDetails.vatExemptSales || 0) + 
                      parseFloat(vatDetails.zeroRatedSales || 0)
                    ).toFixed(2)
                  }
                </Text>
              </View>
            </View>
          )}

          {/* Documents Section */}
          <View style={styles.documentsSection}>
            <Text style={styles.sectionTitle}>Documents Checklist</Text>
            <Text style={styles.sectionSubtitle}>Check off received documents</Text>
            
            <View style={styles.checklistContainer}>
              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => toggleDocument('officialReceipt')}
              >
                <View style={[styles.checkbox, documents.officialReceipt && styles.checkboxChecked]}>
                  {documents.officialReceipt && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>Official Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => toggleDocument('invoice')}
              >
                <View style={[styles.checkbox, documents.invoice && styles.checkboxChecked]}>
                  {documents.invoice && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>Invoice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => toggleDocument('form2307')}
              >
                <View style={[styles.checkbox, documents.form2307 && styles.checkboxChecked]}>
                  {documents.form2307 && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>Form 2307</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => toggleDocument('deliveryReceipt')}
              >
                <View style={[styles.checkbox, documents.deliveryReceipt && styles.checkboxChecked]}>
                  {documents.deliveryReceipt && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>Delivery Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Transaction</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 24,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  cameraButtonDisabled: {
    opacity: 0.6,
  },
  cameraIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  imageStatus: {
    textAlign: 'center',
    color: '#10b981',
    fontSize: 14,
    marginBottom: 16,
  },
  pillContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  pill: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  pillActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  pillText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 0,
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
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  currencySymbol: {
    fontSize: 20,
    color: '#6b7280',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 20,
    color: '#000000',
  },
  vatToggle: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  vatToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  vatDetailsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  vatSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  vatRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  vatInputGroup: {
    flex: 1,
  },
  vatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  vatInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rateContainer: {
    marginBottom: 16,
  },
  rateButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  rateButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  rateButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  rateButtonTextActive: {
    color: '#ffffff',
  },
  calculateButton: {
    backgroundColor: '#4b5563',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryBox: {
    backgroundColor: '#e5e7eb',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  documentsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  checklistContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
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
  checkLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  inputText: {
    fontSize: 16,
    color: '#000000',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  remarksInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  datePickerContainer: {
    marginHorizontal: 24,
    marginTop: -20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionsList: {
    padding: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    width: 50,
  },
  suggestionName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#000000',
    marginHorizontal: 24,
    marginBottom: 32,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  }
});