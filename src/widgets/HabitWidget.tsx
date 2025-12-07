import React from 'react';
import { FlexWidget, TextWidget, ListWidget, SvgWidget } from 'react-native-android-widget';

interface WidgetHabit {
  id: string;
  name: string;
  targetValue: number;
  currentValue: number;
}

export async function renderHabitWidget(habits: WidgetHabit[], theme: 'light' | 'dark' = 'light') {
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#222222' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const subTextColor = isDark ? '#aaaaaa' : '#888888';
  const borderColor = isDark ? '#444444' : '#f0f0f0';
  const progressBg = isDark ? '#444444' : '#f0f0f0';
  const completedText = isDark ? '#888888' : '#aaaaaa';
  const itemText = isDark ? '#eeeeee' : '#333333';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        // 最外层不设背景和圆角，保持透明
      }}
    >
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          backgroundColor: bgColor,
          borderRadius: 14,
          margin: 6, // 减小 margin 以最大化显示区域
          padding: 16,
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <FlexWidget 
             style={{ flexDirection: 'row', alignItems: 'center' }}
             clickAction="OPEN_URI"
             clickActionData={{ uri: 'myplan://home?tab=habit' }}
          >
            <TextWidget
              text="习惯打卡"
              style={{
                fontSize: 18,
                fontFamily: 'Inter',
                fontWeight: 'bold',
                color: textColor,
              }}
            />
          </FlexWidget>

          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text={`${new Date().getMonth() + 1}月${new Date().getDate()}日`}
              style={{
                fontSize: 12,
                color: subTextColor,
                marginRight: 8
              }}
            />
          </FlexWidget>
        </FlexWidget>
        
        {habits.length === 0 ? (
          <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget
              text="🎉 今日习惯已全部完成"
              style={{
                fontSize: 14,
                color: subTextColor,
              }}
            />
          </FlexWidget>
        ) : (
          <ListWidget
            style={{
              height: 'match_parent',
              width: 'match_parent',
            }}
          >
            {habits.map((habit, index) => {
              const isCompleted = habit.currentValue >= habit.targetValue;
              const progress = Math.min(habit.currentValue / habit.targetValue, 1) * 100;
              
              return (
                <FlexWidget
                  key={habit.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                    borderBottomWidth: index < habits.length - 1 ? 0.5 : 0,
                    borderBottomColor: borderColor,
                    width: 'match_parent',
                  }}
                  clickAction={!isCompleted ? 'LOG_HABIT' : undefined}
                  clickActionData={{ habitId: habit.id }}
                >
                  <FlexWidget style={{ flexDirection: 'column', flex: 1, marginRight: 12 }}>
                    <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <TextWidget
                        text={habit.name}
                        style={{
                          fontSize: 15,
                          color: isCompleted ? completedText : itemText,
                          fontWeight: '500',
                          textDecorationLine: isCompleted ? 'line-through' : 'none',
                        }}
                      />
                      <TextWidget
                        text={`${habit.currentValue}/${habit.targetValue}`}
                        style={{
                          fontSize: 12,
                          color: isCompleted ? completedText : subTextColor,
                        }}
                      />
                    </FlexWidget>
                    
                    {/* Progress Bar Background */}
                    <FlexWidget
                      style={{
                        height: 6,
                        width: 'match_parent',
                        backgroundColor: progressBg,
                        borderRadius: 3,
                      }}
                    >
                      {/* Progress Bar Fill */}
                      <FlexWidget
                        style={{
                          height: 6,
                          width: `${Math.max(progress, 5)}%`, // min width to be visible
                          backgroundColor: isCompleted ? '#4CAF50' : '#2196F3',
                          borderRadius: 3,
                        }}
                      />
                    </FlexWidget>
                  </FlexWidget>
                  
                  <FlexWidget
                    style={{
                      height: 32,
                      width: 32,
                      borderRadius: 16,
                      backgroundColor: isCompleted ? (isDark ? '#1b3a1b' : '#E8F5E9') : (isDark ? '#1a2a3a' : '#E3F2FD'),
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <TextWidget
                      text={isCompleted ? '✓' : '+'}
                      style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: isCompleted ? '#4CAF50' : '#2196F3',
                      }}
                    />
                  </FlexWidget>
                </FlexWidget>
              );
            })}
          </ListWidget>)}
      </FlexWidget>
    </FlexWidget>
  );
}
