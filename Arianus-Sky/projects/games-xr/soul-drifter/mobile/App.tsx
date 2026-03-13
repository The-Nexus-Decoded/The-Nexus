import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Soul Drifter Mobile</Text>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          IntentPipe scaffold — pending XR integration
        </Text>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
