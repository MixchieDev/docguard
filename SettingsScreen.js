import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'docguard_settings';

const defaultSettings = {
  documentRequirements: {
    purchase: {
      goods: {
        officialReceipt: true,
        invoice: true,
        deliveryReceipt: false,
        form2307: {
          required: true,
          threshold: 500
        }
      },
      services: {
        officialReceipt: true,
        invoice: true,
        deliveryReceipt: false,
        form2307: {
          required: true,
          threshold: 0 // Always required for services
        }
      }
    },
    sale: {
      withPDC: {
        officialReceipt: true,
        invoice: true,
        deliveryReceipt: true,
        form2307: {
          required: true,
          threshold: 0 // Always required for PDC
        }
      },
      cash: {
        officialReceipt: true,
        invoice: true,
        deliveryReceipt: false,
        form2307: {
          required: false,
          threshold: 500
        }
      }
    }
  },
  aiSettings: {
    autoExtract: true,
    requireVerification: true,
    confidenceThreshold: 80
  },
  reminderSettings: {
    enableAutoReminders: false,
    reminderDays: [1, 3, 7], // Days after transaction
    defaultMessage: 'Hi! Just a friendly reminder that we need the following documents: {DOCS}. Thank you!'
  }
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState(defaultSettings);
  const [expandedSections, setExpandedSections] = useState({
    purchase: false,
    sale: false,
    ai: false,
    reminders: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateDocumentRequirement = (transactionType, subType, docType, value) => {
    const newSettings = { ...settings };
    if (docType === 'form2307') {
      newSettings.documentRequirements[transactionType][subType].form2307.required = value;
    } else {
      newSettings.documentRequirements[transactionType][subType][docType] = value;
    }
    saveSettings(newSettings);
  };

  const updateAISetting = (setting, value) => {
    const newSettings = { ...settings };
    newSettings.aiSettings[setting] = value;
    saveSettings(newSettings);
  };

  const DocumentToggle = ({ label, value, onValueChange }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e5e7eb', true: '#000000' }}
        thumbColor="#ffffff"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Configure DocGuard for your needs</Text>
      </View>

      {/* Purchase Document Requirements */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('purchase')}
      >
        <Text style={styles.sectionTitle}>📥 Purchase Requirements</Text>
        <Text style={styles.chevron}>{expandedSections.purchase ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>

      {expandedSections.purchase && (
        <View style={styles.sectionContent}>
          <Text style={styles.subSectionTitle}>For Goods</Text>
          <DocumentToggle
            label="Official Receipt"
            value={settings.documentRequirements.purchase.goods.officialReceipt}
            onValueChange={(value) => updateDocumentRequirement('purchase', 'goods', 'officialReceipt', value)}
          />
          <DocumentToggle
            label="Invoice"
            value={settings.documentRequirements.purchase.goods.invoice}
            onValueChange={(value) => updateDocumentRequirement('purchase', 'goods', 'invoice', value)}
          />
          <DocumentToggle
            label="Delivery Receipt"
            value={settings.documentRequirements.purchase.goods.deliveryReceipt}
            onValueChange={(value) => updateDocumentRequirement('purchase', 'goods', 'deliveryReceipt', value)}
          />
          <DocumentToggle
            label="Form 2307 (if withholding applies)"
            value={settings.documentRequirements.purchase.goods.form2307.required}
            onValueChange={(value) => updateDocumentRequirement('purchase', 'goods', 'form2307', value)}
          />

          <Text style={[styles.subSectionTitle, { marginTop: 20 }]}>For Services</Text>
          <DocumentToggle
            label="Official Receipt"
            value={settings.documentRequirements.purchase.services.officialReceipt}
            onValueChange={(value) => updateDocumentRequirement('purchase', 'services', 'officialReceipt', value)}
          />
          <DocumentToggle
            label="Invoice"
            value={settings.documentRequirements.purchase.services.invoice}
            onValueChange={(value) => updateDocumentRequirement('purchase', 'services', 'invoice', value)}
          />
          <DocumentToggle
            label="Form 2307 (always required)"
            value={settings.documentRequirements.purchase.services.form2307.required}
            onValueChange={(value) => updateDocumentRequirement('purchase', 'services', 'form2307', value)}
          />
        </View>
      )}

      {/* Sale Document Requirements */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('sale')}
      >
        <Text style={styles.sectionTitle}>📤 Sale Requirements</Text>
        <Text style={styles.chevron}>{expandedSections.sale ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>

      {expandedSections.sale && (
        <View style={styles.sectionContent}>
          <Text style={styles.subSectionTitle}>With PDC</Text>
          <DocumentToggle
            label="Official Receipt"
            value={settings.documentRequirements.sale.withPDC.officialReceipt}
            onValueChange={(value) => updateDocumentRequirement('sale', 'withPDC', 'officialReceipt', value)}
          />
          <DocumentToggle
            label="Invoice"
            value={settings.documentRequirements.sale.withPDC.invoice}
            onValueChange={(value) => updateDocumentRequirement('sale', 'withPDC', 'invoice', value)}
          />
          <DocumentToggle
            label="Delivery Receipt"
            value={settings.documentRequirements.sale.withPDC.deliveryReceipt}
            onValueChange={(value) => updateDocumentRequirement('sale', 'withPDC', 'deliveryReceipt', value)}
          />
          <DocumentToggle
            label="Form 2307 (critical!)"
            value={settings.documentRequirements.sale.withPDC.form2307.required}
            onValueChange={(value) => updateDocumentRequirement('sale', 'withPDC', 'form2307', value)}
          />

          <Text style={[styles.subSectionTitle, { marginTop: 20 }]}>Cash Sales</Text>
          <DocumentToggle
            label="Official Receipt"
            value={settings.documentRequirements.sale.cash.officialReceipt}
            onValueChange={(value) => updateDocumentRequirement('sale', 'cash', 'officialReceipt', value)}
          />
          <DocumentToggle
            label="Invoice"
            value={settings.documentRequirements.sale.cash.invoice}
            onValueChange={(value) => updateDocumentRequirement('sale', 'cash', 'invoice', value)}
          />
          <DocumentToggle
            label="Form 2307 (if applicable)"
            value={settings.documentRequirements.sale.cash.form2307.required}
            onValueChange={(value) => updateDocumentRequirement('sale', 'cash', 'form2307', value)}
          />
        </View>
      )}

      {/* AI Settings */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('ai')}
      >
        <Text style={styles.sectionTitle}>🤖 AI Receipt Reading</Text>
        <Text style={styles.chevron}>{expandedSections.ai ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>

      {expandedSections.ai && (
        <View style={styles.sectionContent}>
          <DocumentToggle
            label="Auto-extract data from photos"
            value={settings.aiSettings.autoExtract}
            onValueChange={(value) => updateAISetting('autoExtract', value)}
          />
          <DocumentToggle
            label="Require verification for AI results"
            value={settings.aiSettings.requireVerification}
            onValueChange={(value) => updateAISetting('requireVerification', value)}
          />
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              AI will read receipts and auto-fill vendor name, amount, and other details. 
              Coming in next update!
            </Text>
          </View>
        </View>
      )}

      {/* About Section */}
      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>About DocGuard</Text>
        <Text style={styles.aboutText}>Version 1.0.0 (MVP)</Text>
        <Text style={styles.aboutText}>Built to prevent BIR compliance issues</Text>
      </View>

      {/* Export Settings */}
      <TouchableOpacity style={styles.exportButton}>
        <Text style={styles.exportButtonText}>Export Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Export the settings getter for use in other screens
export const getSettings = async () => {
  try {
    const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  chevron: {
    fontSize: 20,
    color: '#6b7280',
  },
  sectionContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  aboutSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  exportButton: {
    backgroundColor: '#f3f4f6',
    marginHorizontal: 24,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});