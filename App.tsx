import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Linking,
  Share,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from './utils/supabase';
import { EducationSection } from './src/screens/EducationSection';

type FamilyProfile = {
  display_name: string;
  relation: string;
  role: 'admin' | 'member';
};

type ModuleCard = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
};

const modules: ModuleCard[] = [
  { title: 'الدراسة', subtitle: 'الواجبات والاختبارات والنتائج', icon: '📚', color: '#E8F0FF' },
  { title: 'العبادات', subtitle: 'القرآن والصلاة', icon: '🕌', color: '#E6F6EF' },
  { title: 'المصروفات', subtitle: 'الميزانية والسجل', icon: '💳', color: '#F2EAFF' },
  { title: 'موقعي', subtitle: 'الخريطة ومشاركة الموقع', icon: '📍', color: '#FFE9E6' },
  { title: 'المهام', subtitle: 'المطلوب والمتأخر', icon: '✅', color: '#EAF4E2' },
  { title: 'شجرة العائلة', subtitle: 'الأفراد والفروع', icon: '🌳', color: '#F4EDE4' },
];

export default function App() {
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [screen, setScreen] = useState<'dashboard' | 'education' | 'worship' | 'expenses' | 'location' | 'tasks' | 'familyTree'>('dashboard');

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user && active) {
        await loadProfile(data.session.user.id);
      }
      if (active) setInitializing(false);
    };

    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setProfile(null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('family_members')
      .select('display_name, relation, role')
      .eq('auth_user_id', userId)
      .single();

    if (error || !data) {
      await supabase.auth.signOut();
      Alert.alert('الحساب غير مربوط', 'الحساب صحيح لكنه غير مربوط بأحد أفراد الأسرة.');
      return false;
    }

    setProfile(data as FamilyProfile);
    return true;
  };

  const signIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('بيانات ناقصة', 'اكتب البريد الإلكتروني وكلمة المرور أولًا.');
      return;
    }

    setSigningIn(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      Alert.alert('تعذر تسجيل الدخول', 'تأكد من البريد الإلكتروني وكلمة المرور.');
      setSigningIn(false);
      return;
    }

    await loadProfile(data.user.id);
    setSigningIn(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setScreen('dashboard');
    setPassword('');
  };

  if (initializing) {
    return (
      <SafeAreaView style={styles.loadingPage}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={styles.loadingText}>جاري فتح My Family...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {profile ? (
        screen === 'education' ? (
          <EducationSection
            isAdmin={profile.role === 'admin'}
            currentUserName={profile.display_name}
            onBack={() => setScreen('dashboard')}
          />
        ) : screen === 'worship' ? (
          <WorshipSection onBack={() => setScreen('dashboard')} />
        ) : screen === 'expenses' ? (
          <ExpensesSection onBack={() => setScreen('dashboard')} />
        ) : screen === 'location' ? (
          <LocationSection onBack={() => setScreen('dashboard')} />
        ) : screen === 'tasks' ? (
          <TasksSection onBack={() => setScreen('dashboard')} />
        ) : screen === 'familyTree' ? (
          <FamilyTreeSection onBack={() => setScreen('dashboard')} />
        ) : (
          <Dashboard profile={profile} onLogout={signOut} onOpenModule={(target) => setScreen(target)} />
        )
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.loginPage} keyboardShouldPersistTaps="handled">
            <View style={styles.brandMark}>
              <Text style={styles.brandEmoji}>🏡</Text>
            </View>
            <Text style={styles.brandName}>My Family</Text>
            <Text style={styles.brandArabic}>عائلتي في مكان واحد</Text>

            <View style={styles.loginCard}>
              <Text style={styles.cardTitle}>تسجيل الدخول</Text>
              <Text style={styles.cardHint}>أدخل بيانات حسابك للوصول إلى مساحتك الخاصة</Text>

              <Text style={styles.label}>البريد الإلكتروني</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="اكتب البريد الإلكتروني"
                placeholderTextColor="#9AA4B2"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                textAlign="right"
              />

              <Text style={styles.label}>كلمة المرور</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="اكتب كلمة المرور"
                placeholderTextColor="#9AA4B2"
                secureTextEntry
                style={styles.input}
                textAlign="right"
                onSubmitEditing={signIn}
              />

              <Pressable
                onPress={signIn}
                disabled={signingIn}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  signingIn && styles.buttonDisabled,
                ]}
              >
                {signingIn ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>دخول آمن</Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.privacyText}>🔒 بيانات الأسرة خاصة ولا يراها إلا أصحاب الصلاحية</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Dashboard({
  profile,
  onLogout,
  onOpenModule,
}: {
  profile: FamilyProfile;
  onLogout: () => void;
  onOpenModule: (target: 'education' | 'worship' | 'expenses' | 'location' | 'tasks' | 'familyTree') => void;
}) {
  const today = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <ScrollView style={styles.dashboard} contentContainerStyle={styles.dashboardContent}>
      <View style={styles.topBar}>
        <Pressable onPress={onLogout} hitSlop={12}>
          <Text style={styles.logout}>خروج</Text>
        </Pressable>
        <View style={styles.userBlock}>
          <View>
            <Text style={styles.welcome}>أهلًا يا {profile.display_name}</Text>
            <Text style={styles.role}>{profile.role === 'admin' ? 'مدير العائلة' : profile.relation}</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{profile.display_name.charAt(0)}</Text></View>
        </View>
      </View>

      <View style={styles.newsBar}>
        <Text style={styles.newsLabel}>أخبار الأسرة</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsTrack}>
          <Text style={styles.newsText}>مرحبًا بكم في My Family • متابعة الدراسة والمهام والعبادات في مكان واحد • يمكن تحديث الأخبار لاحقًا من لوحة الإدارة</Text>
        </ScrollView>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>{today}</Text>
        <Text style={styles.heroTitle}>مساء الخير 👋</Text>
        <Text style={styles.heroText}>تابع أسرتك واطمئن عليهم من مكان واحد</Text>
        <View style={styles.heroStats}>
          <Stat value="10" label="أفراد الأسرة" />
          <View style={styles.statDivider} />
          <Stat value="0" label="تنبيهات اليوم" />
          <View style={styles.statDivider} />
          <Stat value="0" label="مهام قادمة" />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionAction}>عرض الكل</Text>
        <Text style={styles.sectionTitle}>أقسام My Family</Text>
      </View>

      <View style={styles.grid}>
        {modules.map((item) => (
          <Pressable
            key={item.title}
            onPress={() => {
              const targets: Record<string, 'education' | 'worship' | 'expenses' | 'location' | 'tasks' | 'familyTree'> = {
                'الدراسة': 'education',
                'العبادات': 'worship',
                'المصروفات': 'expenses',
                'موقعي': 'location',
                'المهام': 'tasks',
                'شجرة العائلة': 'familyTree',
              };
              onOpenModule(targets[item.title]);
            }}
            style={({ pressed }) => [styles.moduleCard, pressed && styles.modulePressed]}
          >
            <View style={[styles.moduleIcon, { backgroundColor: item.color }]}>
              <Text style={styles.moduleEmoji}>{item.icon}</Text>
            </View>
            <Text style={styles.moduleTitle}>{item.title}</Text>
            <Text style={styles.moduleSubtitle}>{item.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeIcon}>🔔</Text>
        <View style={styles.noticeTextBlock}>
          <Text style={styles.noticeTitle}>ملخص اليوم</Text>
          <Text style={styles.noticeText}>ستظهر هنا التنبيهات الحقيقية بعد ربط قاعدة البيانات.</Text>
        </View>
      </View>
    </ScrollView>
  );
}


function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.sectionPageHeader}>
      <Pressable onPress={onBack} style={styles.sectionBackButton}>
        <Text style={styles.sectionBackText}>رجوع</Text>
        <Text style={styles.sectionBackArrow}>‹</Text>
      </Pressable>
      <Text style={styles.sectionPageTitle}>{title}</Text>
      <View style={styles.sectionHeaderSpacer} />
    </View>
  );
}

function WorshipSection({ onBack }: { onBack: () => void }) {
  const prayers = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
  const [done, setDone] = useState<string[]>([]);
  const [quran, setQuran] = useState('');
  return <ScrollView style={styles.simplePage} contentContainerStyle={styles.simpleContent}>
    <SectionHeader title="العبادات" onBack={onBack} />
    <Text style={styles.simpleTitle}>صلوات اليوم</Text>
    {prayers.map((p) => <Pressable key={p} onPress={() => setDone(v => v.includes(p) ? v.filter(x => x !== p) : [...v, p])} style={[styles.checkRow, done.includes(p) && styles.checkRowDone]}><Text style={styles.checkMark}>{done.includes(p) ? '✓' : '○'}</Text><Text style={styles.checkLabel}>{p}</Text></Pressable>)}
    <Text style={styles.simpleTitle}>ورد القرآن</Text>
    <View style={styles.simpleCard}><TextInput value={quran} onChangeText={setQuran} placeholder="مثال: سورة البقرة من آية 1 إلى 20" style={styles.simpleInput} textAlign="right"/><Text style={styles.helperText}>يُحفظ مؤقتًا على الجهاز في هذه النسخة.</Text></View>
  </ScrollView>;
}

function ExpensesSection({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<{id:string; title:string; amount:number}[]>([]);
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState('');
  const add=()=>{const n=Number(amount); if(!title.trim()||!n){Alert.alert('بيانات ناقصة','اكتب البيان والمبلغ.');return;} setItems(v=>[{id:String(Date.now()),title:title.trim(),amount:n},...v]);setTitle('');setAmount('');};
  return <ScrollView style={styles.simplePage} contentContainerStyle={styles.simpleContent}><SectionHeader title="المصروفات" onBack={onBack}/><View style={styles.simpleCard}><TextInput value={title} onChangeText={setTitle} placeholder="بيان المصروف" style={styles.simpleInput} textAlign="right"/><TextInput value={amount} onChangeText={setAmount} placeholder="المبلغ" keyboardType="numeric" style={styles.simpleInput} textAlign="right"/><Pressable onPress={add} style={styles.actionButton}><Text style={styles.actionButtonText}>إضافة مصروف</Text></Pressable></View><Text style={styles.totalText}>الإجمالي: {items.reduce((s,x)=>s+x.amount,0)} جنيه</Text>{items.map(x=><View key={x.id} style={styles.listRow}><Text style={styles.amountText}>{x.amount}</Text><Text style={styles.listText}>{x.title}</Text></View>)}</ScrollView>;
}

function LocationSection({ onBack }: { onBack: () => void }) {
  const openMaps=()=>Linking.openURL('https://www.google.com/maps');
  const share=()=>Share.share({message:'موقعي عبر خرائط Google: https://www.google.com/maps'});
  return <ScrollView style={styles.simplePage} contentContainerStyle={styles.simpleContent}><SectionHeader title="موقعي" onBack={onBack}/><View style={styles.locationCard}><Text style={styles.locationEmoji}>📍</Text><Text style={styles.simpleTitle}>مشاركة الموقع</Text><Text style={styles.helperText}>افتح الخريطة وحدد موقعك، ثم شاركه مع الأسرة. التتبع الحي سيُربط في المرحلة التالية بصلاحية الموقع.</Text><Pressable onPress={openMaps} style={styles.actionButton}><Text style={styles.actionButtonText}>فتح الخريطة</Text></Pressable><Pressable onPress={share} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>مشاركة رابط الموقع</Text></Pressable></View></ScrollView>;
}

function TasksSection({ onBack }: { onBack: () => void }) {
  const [tasks,setTasks]=useState<{id:string;text:string;done:boolean}[]>([]); const [text,setText]=useState('');
  const add=()=>{if(!text.trim())return;setTasks(v=>[{id:String(Date.now()),text:text.trim(),done:false},...v]);setText('');};
  return <ScrollView style={styles.simplePage} contentContainerStyle={styles.simpleContent}><SectionHeader title="المهام" onBack={onBack}/><View style={styles.simpleCard}><TextInput value={text} onChangeText={setText} placeholder="أضف مهمة جديدة" style={styles.simpleInput} textAlign="right"/><Pressable onPress={add} style={styles.actionButton}><Text style={styles.actionButtonText}>إضافة المهمة</Text></Pressable></View>{tasks.map(t=><Pressable key={t.id} onPress={()=>setTasks(v=>v.map(x=>x.id===t.id?{...x,done:!x.done}:x))} style={[styles.checkRow,t.done&&styles.checkRowDone]}><Text style={styles.checkMark}>{t.done?'✓':'○'}</Text><Text style={[styles.checkLabel,t.done&&styles.doneText]}>{t.text}</Text></Pressable>)}</ScrollView>;
}

function FamilyTreeSection({ onBack }: { onBack: () => void }) {
  const [members,setMembers]=useState([{id:'1',name:'جاسم',relation:'الأب'},{id:'2',name:'أم محمد',relation:'الأم'},{id:'3',name:'محمد',relation:'الابن'},{id:'4',name:'مصطفى',relation:'الابن'},{id:'5',name:'منة',relation:'الابنة'},{id:'6',name:'مها',relation:'الابنة'},{id:'7',name:'مازن',relation:'الابن'}]);
  const [name,setName]=useState('');const [relation,setRelation]=useState('');
  const add=()=>{if(!name.trim()||!relation.trim()){Alert.alert('بيانات ناقصة','اكتب الاسم وصلة القرابة.');return;}setMembers(v=>[...v,{id:String(Date.now()),name:name.trim(),relation:relation.trim()}]);setName('');setRelation('');};
  return <ScrollView style={styles.simplePage} contentContainerStyle={styles.simpleContent}><SectionHeader title="شجرة العائلة" onBack={onBack}/><View style={styles.treeRoot}><Text style={styles.treeRootText}>العائلة</Text></View><View style={styles.treeGrid}>{members.map(m=><View key={m.id} style={styles.treeNode}><View style={styles.treeAvatar}><Text style={styles.treeAvatarText}>{m.name[0]}</Text></View><Text style={styles.treeName}>{m.name}</Text><Text style={styles.treeRelation}>{m.relation}</Text></View>)}</View><View style={styles.simpleCard}><Text style={styles.simpleTitle}>إضافة فرد</Text><TextInput value={name} onChangeText={setName} placeholder="الاسم" style={styles.simpleInput} textAlign="right"/><TextInput value={relation} onChangeText={setRelation} placeholder="صلة القرابة" style={styles.simpleInput} textAlign="right"/><Pressable onPress={add} style={styles.actionButton}><Text style={styles.actionButtonText}>إضافة إلى الشجرة</Text></Pressable></View></ScrollView>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const colors = {
  navy: '#173B57',
  teal: '#2A8C82',
  sand: '#F6F2EB',
  ink: '#20303C',
  muted: '#70808E',
  border: '#E4E9ED',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.sand },
  loadingPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sand,
  },
  loadingText: { marginTop: 14, color: colors.muted, fontSize: 14 },
  loginPage: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: colors.sand,
  },
  brandMark: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#173B57',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  brandEmoji: { fontSize: 38 },
  brandName: {
    marginTop: 16,
    fontSize: 31,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  brandArabic: {
    marginTop: 4,
    marginBottom: 28,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  loginCard: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#1B2A35',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'right',
  },
  cardHint: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 13,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'right',
  },
  input: {
    height: 54,
    marginBottom: 17,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFBFC',
    color: colors.ink,
    fontSize: 15,
    writingDirection: 'rtl',
  },
  primaryButton: {
    height: 55,
    marginTop: 4,
    borderRadius: 15,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.white, fontSize: 17, fontWeight: '800' },
  privacyText: {
    marginTop: 22,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  dashboard: { flex: 1, backgroundColor: '#F7F8FA' },
  dashboardContent: { padding: 18, paddingBottom: 42 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  userBlock: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 20, fontWeight: '800' },
  welcome: { textAlign: 'right', fontSize: 18, fontWeight: '800', color: colors.ink },
  role: { marginTop: 2, textAlign: 'right', fontSize: 12, color: colors.muted },
  logout: { color: '#B84C4C', fontSize: 13, fontWeight: '700' },
  hero: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.navy,
    overflow: 'hidden',
  },
  heroEyebrow: { textAlign: 'right', color: '#BFD4E1', fontSize: 12 },
  heroTitle: { marginTop: 8, textAlign: 'right', color: colors.white, fontSize: 25, fontWeight: '800' },
  heroText: { marginTop: 4, textAlign: 'right', color: '#DCE8EF', fontSize: 13 },
  heroStats: {
    marginTop: 21,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: '#31556E',
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '800' },
  statLabel: { marginTop: 3, color: '#BFD4E1', fontSize: 10 },
  statDivider: { width: 1, height: 30, backgroundColor: '#31556E' },
  sectionHeader: {
    marginTop: 25,
    marginBottom: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.ink },
  sectionAction: { fontSize: 12, color: colors.teal, fontWeight: '700' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  moduleCard: {
    width: '48%',
    minHeight: 148,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'flex-end',
  },
  modulePressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  moduleIcon: {
    width: 48,
    height: 48,
    marginBottom: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleEmoji: { fontSize: 23 },
  moduleTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, textAlign: 'right' },
  moduleSubtitle: { marginTop: 4, fontSize: 11, color: colors.muted, textAlign: 'right' },
  noticeCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#E8F4F2',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  noticeIcon: { fontSize: 23 },
  noticeTextBlock: { flex: 1 },
  noticeTitle: { textAlign: 'right', color: colors.ink, fontSize: 14, fontWeight: '800' },
  noticeText: { marginTop: 3, textAlign: 'right', color: colors.muted, fontSize: 11, lineHeight: 18 },

  newsBar: { marginBottom: 14, borderRadius: 15, backgroundColor: '#FFF7DD', flexDirection: 'row-reverse', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#F1E1A8' },
  newsLabel: { paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#E8B84A', color: '#25313A', fontWeight: '800', fontSize: 12 },
  newsTrack: { paddingHorizontal: 12, alignItems: 'center' },
  newsText: { color: '#6C5B25', fontSize: 12, writingDirection: 'rtl' },
  simplePage: { flex: 1, backgroundColor: '#F7F8FA' },
  simpleContent: { padding: 18, paddingBottom: 50 },
  sectionPageHeader: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  sectionBackButton: { width: 82, height: 42, borderRadius: 13, backgroundColor: '#E8F4F2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  sectionBackText: { color: colors.teal, fontWeight: '800', fontSize: 13 },
  sectionBackArrow: { color: colors.teal, fontSize: 28, lineHeight: 28 },
  sectionPageTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: 22, fontWeight: '800' },
  sectionHeaderSpacer: { width: 82 },
  simpleTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'right', marginBottom: 12, marginTop: 8 },
  simpleCard: { padding: 16, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  simpleInput: { height: 49, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 13, marginBottom: 10, backgroundColor: '#FAFBFC', color: colors.ink },
  actionButton: { height: 48, borderRadius: 13, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  actionButtonText: { color: colors.white, fontWeight: '800' },
  secondaryButton: { height: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryButtonText: { color: colors.teal, fontWeight: '800' },
  helperText: { color: colors.muted, fontSize: 12, textAlign: 'right', lineHeight: 19 },
  checkRow: { minHeight: 54, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkRowDone: { backgroundColor: '#EAF7F1', borderColor: '#B8E0CF' },
  checkMark: { color: colors.teal, fontSize: 22, fontWeight: '800' },
  checkLabel: { flex: 1, textAlign: 'right', color: colors.ink, fontSize: 15, fontWeight: '700' },
  doneText: { textDecorationLine: 'line-through', color: colors.muted },
  totalText: { color: colors.navy, fontSize: 18, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  listRow: { padding: 15, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginBottom: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listText: { flex: 1, textAlign: 'right', color: colors.ink, fontWeight: '700' },
  amountText: { color: colors.teal, fontWeight: '800' },
  locationCard: { padding: 22, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  locationEmoji: { fontSize: 48, marginBottom: 8 },
  treeRoot: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 16, backgroundColor: colors.navy, marginBottom: 18 },
  treeRootText: { color: colors.white, fontWeight: '800', fontSize: 17 },
  treeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 18 },
  treeNode: { width: '31%', minHeight: 118, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 10 },
  treeAvatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#E8F4F2', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  treeAvatarText: { color: colors.teal, fontSize: 18, fontWeight: '800' },
  treeName: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  treeRelation: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: 'center' },
});
