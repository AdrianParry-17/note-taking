import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export interface ComboOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchComboBoxProps {
  value: string | null;
  options: ComboOption[];
  onChange: (value: string | null) => void;
  placeholder: string;
  emptyLabel?: string;
  nullLabel?: string;
  allowClear?: boolean;
}

export function SearchComboBox({
  value,
  options,
  onChange,
  placeholder,
  emptyLabel = 'No matching options',
  nullLabel = 'None',
  allowClear = true,
}: SearchComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter((option) => {
      const haystack = `${option.label} ${option.subtitle ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, query]);

  return (
    <View style={styles.root}>
      <Pressable onPress={() => setOpen((current) => !current)} style={styles.trigger}>
        <Text numberOfLines={1} style={[styles.triggerText, !selected && styles.placeholderText]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.dropdown}>
          <TextInput
            onChangeText={setQuery}
            placeholder="Search..."
            placeholderTextColor="#8494AB"
            style={styles.searchInput}
            value={query}
          />

          {allowClear ? (
            <Pressable
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
              style={styles.clearButton}>
              <Text style={styles.clearButtonText}>{nullLabel}</Text>
            </Pressable>
          ) : null}

          <ScrollView style={styles.optionsWrap}>
            {filtered.length === 0 ? <Text style={styles.emptyText}>{emptyLabel}</Text> : null}
            {filtered.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={[styles.option, active && styles.optionActive]}>
                  <Text style={styles.optionText}>{option.label}</Text>
                  {option.subtitle ? <Text style={styles.optionSubtitle}>{option.subtitle}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  trigger: {
    minHeight: 38,
    borderRadius: 10,
    borderColor: '#273346',
    borderWidth: 1,
    backgroundColor: '#0F141D',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  triggerText: {
    color: '#E4ECF8',
    fontSize: 13,
    flex: 1,
  },
  placeholderText: {
    color: '#8898AE',
  },
  chevron: {
    color: '#BFD3EC',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#263247',
    backgroundColor: '#0E131C',
    padding: 8,
    gap: 8,
  },
  searchInput: {
    minHeight: 34,
    borderRadius: 8,
    borderColor: '#2A3649',
    borderWidth: 1,
    backgroundColor: '#101824',
    color: '#E4ECF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  clearButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#344662',
    backgroundColor: '#142235',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#CFE7FF',
    fontSize: 11,
    fontWeight: '700',
  },
  optionsWrap: {
    maxHeight: 180,
  },
  option: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27364A',
    backgroundColor: '#111A27',
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 6,
    gap: 2,
  },
  optionActive: {
    borderColor: '#59B4FF',
    backgroundColor: '#12263B',
  },
  optionText: {
    color: '#E6EEF9',
    fontSize: 12,
    fontWeight: '600',
  },
  optionSubtitle: {
    color: '#9CB2C8',
    fontSize: 11,
  },
  emptyText: {
    color: '#8FA3BB',
    fontSize: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
});