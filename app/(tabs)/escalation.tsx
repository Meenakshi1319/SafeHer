import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';

const steps = [
  {
    icon: '👨‍👩‍👧',
    title: 'Family Alerted',
    sub: 'Priya, Mom, Dad notified',
    time: '10:32 PM',
    status: 'done',
    color: '#4caf8a',
    detail: 'Live location shared via SMS and app notification',
  },
  {
    icon: '🙋',
    title: 'Volunteers Activated',
    sub: '3 volunteers nearby notified',
    time: '10:33 PM',
    status: 'active',
    color: '#e05a7a',
    detail: 'Priya S. (0.8km), Rahul M. (1.2km) are responding',
  },
  {
    icon: '🚔',
    title: 'Police Alert',
    sub: 'Waiting for escalation...',
    time: '--',
    status: 'pending',
    color: '#666',
    detail: 'Will be triggered if no response in 60 seconds',
  },
  {
    icon: '⚖️',
    title: 'Legal Support',
    sub: 'Evidence being collected',
    time: '--',
    status: 'pending',
    color: '#666',
    detail: 'Audio/video encrypted and stored as legal evidence',
  },
];

export default function EscalationScreen() {
  const [activeStep, setActiveStep] = useState(1);

  function escalate() {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Escalation Flow</Text>
          <Text style={styles.subtitle}>Smart alert system</Text>
        </View>

        {/* Alert Banner */}
        <View style={styles.alertBanner}>
          <Text style={styles.alertIcon}>🚨</Text>
          <View>
            <Text style={styles.alertTitle}>SOS Active</Text>
            <Text style={styles.alertSub}>Started at 10:32 PM • 2 mins ago</Text>
          </View>
          <View style={styles.alertDot} />
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {steps.map((step, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            const isPending = i > activeStep;

            return (
              <View key={i} style={styles.timelineRow}>

                {/* Left side — icon + line */}
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.stepIcon,
                    isDone && { backgroundColor: '#4caf8a' },
                    isActive && { backgroundColor: '#e05a7a' },
                    isPending && { backgroundColor: 'rgba(255,255,255,0.08)' },
                  ]}>
                    <Text style={{ fontSize: 18 }}>{step.icon}</Text>
                  </View>
                  {i < steps.length - 1 && (
                    <View style={[
                      styles.connector,
                      isDone && { backgroundColor: '#4caf8a' },
                      isActive && { backgroundColor: '#e05a7a50' },
                      isPending && { backgroundColor: 'rgba(255,255,255,0.08)' },
                    ]} />
                  )}
                </View>

                {/* Right side — content */}
                <View style={styles.timelineContent}>
                  <View style={styles.stepHeader}>
                    <Text style={[
                      styles.stepTitle,
                      isPending && { color: 'rgba(255,255,255,0.3)' }
                    ]}>
                      {step.title}
                    </Text>
                    <Text style={[
                      styles.stepTime,
                      isActive && { color: '#e05a7a' },
                      isDone && { color: '#4caf8a' },
                    ]}>
                      {step.time}
                    </Text>
                  </View>
                  <Text style={[
                    styles.stepSub,
                    isPending && { color: 'rgba(255,255,255,0.2)' }
                  ]}>
                    {step.sub}
                  </Text>
                  {(isDone || isActive) && (
                    <View style={[
                      styles.detailBox,
                      { borderColor: isDone ? '#4caf8a30' : '#e05a7a30' }
                    ]}>
                      <Text style={styles.detailText}>{step.detail}</Text>
                    </View>
                  )}
                  {isActive && (
                    <View style={styles.activePill}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activeText}>In Progress</Text>
                    </View>
                  )}
                  {isDone && (
                    <View style={styles.donePill}>
                      <Text style={styles.doneText}>✅ Completed</Text>
                    </View>
                  )}
                </View>

              </View>
            );
          })}
        </View>

        {/* Escalate Button */}
        {activeStep < steps.length - 1 && (
          <TouchableOpacity style={styles.escalateBtn} onPress={escalate}>
            <Text style={styles.escalateText}>⬆️ Escalate Now</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setActiveStep(0)}
        >
          <Text style={styles.cancelText}>Cancel SOS</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
  header: {
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '500',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 4,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#1a0a0f',
    borderWidth: 0.5,
    borderColor: '#e05a7a40',
    borderRadius: 14,
    padding: 14,
  },
  alertIcon: {
    fontSize: 24,
  },
  alertTitle: {
    color: '#e05a7a',
    fontSize: 14,
    fontWeight: '500',
  },
  alertSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 2,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e05a7a',
    marginLeft: 'auto',
  },
  timeline: {
    paddingHorizontal: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineLeft: {
    alignItems: 'center',
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 30,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
    gap: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  stepTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  stepSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  detailBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  detailText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 18,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e05a7a',
  },
  activeText: {
    color: '#e05a7a',
    fontSize: 11,
  },
  donePill: {
    marginTop: 4,
  },
  doneText: {
    color: '#4caf8a',
    fontSize: 11,
  },
  escalateBtn: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#e05a7a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#e05a7a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  escalateText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
  },
});