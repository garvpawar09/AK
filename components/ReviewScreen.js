import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, PanResponder, Animated, Dimensions, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatWithAI } from '../services/aiService';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.45;

export default function ReviewScreen({ reviewData, onUpdate, userPreferences }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // Track expansion state

    // Animation Values
    const imageHeight = useRef(new Animated.Value(IMAGE_HEIGHT)).current;
    const contentMargin = useRef(new Animated.Value(-30)).current; // Start with overlap
    const scrollViewRef = useRef();

    useEffect(() => {
        if (reviewData && reviewData.messages) {
            setMessages(reviewData.messages);
        } else {
            setMessages([]);
        }
        // Only reset chat visibility if we are loading a DIFFERENT item (check via unique ID like date)
        // We do NOT want to reset if we just updated the messages for the current item.
    }, [reviewData?.date]);

    // Reset chat closed ONLY when a brand new non-existing data comes in (or component mounts first time)
    useEffect(() => {
        setShowChat(false);
        collapseCard(); // Reset on new item
    }, [reviewData?.date]);

    // Handle Hardware Back Button (Android)
    useEffect(() => {
        const backAction = () => {
            if (isExpanded) {
                collapseCard();
                return true; // Prevent default behavior
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [isExpanded]);

    const expandCard = () => {
        setIsExpanded(true);
        Animated.parallel([
            Animated.timing(imageHeight, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false
            }),
            Animated.timing(contentMargin, {
                toValue: 0, // No overlap when expanded
                duration: 300,
                useNativeDriver: false
            })
        ]).start();
    };

    const collapseCard = () => {
        setIsExpanded(false);
        Animated.parallel([
            Animated.timing(imageHeight, {
                toValue: IMAGE_HEIGHT,
                duration: 300,
                useNativeDriver: false
            }),
            Animated.timing(contentMargin, {
                toValue: -30, // Restore overlap
                duration: 300,
                useNativeDriver: false
            })
        ]).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 10;
            },
            onPanResponderGrant: () => {
                imageHeight.stopAnimation();
                contentMargin.stopAnimation();
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -50) {
                    // Dragged Up -> Full Screen
                    expandCard();
                } else if (gestureState.dy > 50) {
                    // Dragged Down -> Default
                    collapseCard();
                } else {
                    // Snap back if not dragged enough?
                    // For now, staying in current state is fine, or re-run active state animation
                    if (isExpanded) {
                        expandCard();
                    } else {
                        collapseCard();
                    }
                }
            },
            onPanResponderTerminate: () => {
                // Reset to current state if interrupted
                if (isExpanded) {
                    expandCard();
                } else {
                    collapseCard();
                }
            }
        })
    ).current;

    if (!reviewData) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="scan-outline" size={60} color="#444" />
                <Text style={styles.emptyText}>Scan an item to see the review.</Text>
            </View>
        );
    }

    const { uri, status, ingredient, reason } = reviewData;
    const statusColor = getStatusColor(status);

    const getCardText = (s) => {
        if (s === 'NO') return "No, It is not recommended to eat for you";
        if (s === 'YES') return "Yes, It is safe for you to eat";
        return "Moderate, consume with caution";
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const newMsg = { text: input, isUser: true };
        const updatedMessages = [...messages, newMsg];

        setMessages(updatedMessages);
        setInput('');

        const updatedData = { ...reviewData, messages: updatedMessages };
        onUpdate(updatedData);

        // Call AI
        const responseText = await chatWithAI(reviewData, userPreferences, updatedMessages, newMsg.text);

        const replyMsg = { text: responseText, isUser: false };
        const finalMessages = [...updatedMessages, replyMsg];
        setMessages(finalMessages);

        const finalData = { ...reviewData, messages: finalMessages };
        onUpdate(finalData);
    };

    const handleKnowWhy = () => {
        setShowChat(true);
        // Auto expand on Know Why for better UX? Or just show chat.
        // Let's just show chat for now as per previous, but dragging is available.
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    return (
        <View style={styles.container}>
            {/* Background Image (Animated Height) */}
            <Animated.View style={[styles.imageContainer, { height: imageHeight }]}>
                <Image source={{ uri: uri }} style={styles.image} resizeMode="cover" />
                <View style={styles.gradientOverlay} />
            </Animated.View>

            {/* Content Container (Draggable Handle) */}
            <KeyboardAvoidingView
                style={styles.flexContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} // Standard iOS offset
            >
                {/* Animated Margin for Content */}
                <Animated.View style={[styles.contentContainer, { marginTop: contentMargin }]} >

                    {/* Drag Handle & Collapse Button */}
                    <View style={styles.handleContainer} {...panResponder.panHandlers}>
                        <View style={styles.handleBar} />
                        {isExpanded && (
                            <TouchableOpacity style={styles.collapseButton} onPress={collapseCard}>
                                <Ionicons name="chevron-down" size={24} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Scrollable Content inside the card */}
                    <View style={styles.innerContent}>

                        {/* Status Card */}
                        <View style={[styles.statusCard, { borderColor: statusColor }]}>
                            <View style={styles.cardContent}>
                                <View style={styles.cardHeaderRow}>
                                    <Text style={[styles.sketchTitle, { flex: 1, marginBottom: 0 }]}>{getCardText(status)}</Text>
                                    <Speedometer score={reviewData.health_score || 50} color={statusColor} />
                                </View>

                                <View style={styles.rowBetween}>
                                    <Text style={styles.reasonText}>
                                        {reviewData.harmful_ingredients && reviewData.harmful_ingredients !== "None"
                                            ? `Harmful Ingredients: ${reviewData.harmful_ingredients}`
                                            : "Contains: No harmful ingredients found"}
                                    </Text>
                                    <TouchableOpacity style={[styles.pillButton, { borderColor: statusColor }]} onPress={handleKnowWhy}>
                                        <Text style={[styles.pillText, { color: statusColor }]}>know why</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Chat Section */}
                        {showChat && (
                            <View style={styles.chatSection}>
                                <Text style={styles.chatHeader}>Chat with AI Agent</Text>
                                <ScrollView
                                    ref={scrollViewRef}
                                    style={styles.chatList}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                                >
                                    {messages.length === 0 && (
                                        <Text style={styles.chatPlaceholder}>Why is this bad for me?</Text>
                                    )}
                                    {messages.map((msg, index) => (
                                        <View key={index} style={[styles.bubble, msg.isUser ? styles.userBubble : styles.agentBubble]}>
                                            <Text style={styles.bubbleText}>{msg.text}</Text>
                                        </View>
                                    ))}
                                </ScrollView>

                                {/* Input */}
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Type a message..."
                                        placeholderTextColor="#666"
                                        value={input}
                                        onChangeText={setInput}
                                    />
                                    <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                                        <Ionicons name="send" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {!showChat && (
                            <View style={styles.placeholderSpace}>
                                <Text style={styles.hintText}>Click "know why" to chat/expand</Text>
                                <Text style={styles.hintSubText}>Pull up to full screen</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const getStatusColor = (status) => {
    switch (status) {
        case 'YES': return '#4CAF50';
        case 'NO': return '#F44336';
        case 'MODERATE': return '#FFC107';
        default: return '#888';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    flexContainer: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#666',
        marginTop: 20,
        fontSize: 16,
    },
    imageContainer: {
        width: '100%',
        // Height is animated
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#111',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        // marginTop is now animated inline
        overflow: 'hidden',
    },
    handleContainer: {
        height: 30,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        position: 'relative', // For absolute positioning of collapse button
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#444',
        borderRadius: 2,
    },
    collapseButton: {
        position: 'absolute',
        right: 20,
        top: 5,
        padding: 5,
    },
    innerContent: {
        flex: 1,
        padding: 20,
        paddingTop: 10,
    },
    statusCard: {
        borderWidth: 2,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        backgroundColor: '#1a1a1a',
    },
    cardContent: {
        padding: 20,
    },
    sketchTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 20,
        marginBottom: 15,
        lineHeight: 28,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    reasonText: {
        color: '#888',
        fontSize: 12,
        fontStyle: 'italic',
        maxWidth: '65%',
    },
    pillButton: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    pillText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    chatSection: {
        flex: 1,
    },
    placeholderSpace: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.3,
    },
    hintText: {
        color: 'white',
        fontStyle: 'italic',
    },
    hintSubText: {
        color: '#444',
        fontSize: 10,
        marginTop: 5,
    },
    chatHeader: {
        color: '#666',
        fontSize: 12,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    chatList: {
        flex: 1,
    },
    chatPlaceholder: {
        color: '#444',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
    bubble: {
        padding: 10,
        borderRadius: 12,
        marginBottom: 8,
        maxWidth: '80%',
    },
    userBubble: {
        backgroundColor: '#2196F3',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 2,
    },
    agentBubble: {
        backgroundColor: '#333',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 2,
    },
    bubbleText: {
        color: 'white',
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10, // Extra padding for safety
        backgroundColor: '#111',
    },
    input: {
        flex: 1,
        backgroundColor: '#FFFFFF', // White background
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 12, // More vertical padding
        color: '#000000', // Black text
        marginRight: 10,
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: '#2196F3',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
});

const Speedometer = ({ score, color }) => {
    // Score 0-100
    // Angle: -90 (0) to 90 (100)
    const rotation = (score / 100) * 180 - 90;

    return (
        <View style={{ alignItems: 'center', marginLeft: 10 }}>
            <View style={{
                width: 60,
                height: 30, // Half circle
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                backgroundColor: 'transparent',
                borderWidth: 4,
                borderColor: color,
                borderBottomWidth: 0,
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Needle: Height 60, Centered at bottom (top of container + 30) 
                    Actually easier: 
                    Needle Height 60.
                    Bottom: -30.
                    Left: (60/2) - (4/2) = 28.
                    Pivot is center of needle which aligns with bottom of semi-circle.
                */}
                <View style={{
                    position: 'absolute',
                    bottom: -30,
                    left: 28,
                    width: 4,
                    height: 60,
                    // backgroundColor: 'transparent', // Full needle container
                    // We only want the top half to be visible? 
                    // Since container has overflow hidden, the bottom half (which sticks out) is hidden ONLY if it was inside? 
                    // Wait, absolute positioning outside container bounds with overflow hidden clipps it.
                    // If bottom is -30, the center is at 0 (relative to bottom edge).
                    // This puts the needle center at the bottom edge. Perfect.
                    transform: [
                        { rotate: `${rotation}deg` }
                    ],
                }}>
                    {/* The visible part of the needle (top half) */}
                    <View style={{ flex: 1, backgroundColor: 'white', borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
                    {/* The invisible part (bottom half) to force center pivot */}
                    <View style={{ flex: 1, backgroundColor: 'transparent' }} />
                </View>
            </View>
            <Text style={{ color: color, fontWeight: 'bold', fontSize: 12, marginTop: 4 }}>
                {score}/100
            </Text>
        </View>
    );
};
