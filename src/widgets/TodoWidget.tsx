import React from 'react';
import { FlexWidget, TextWidget, ListWidget, SvgWidget } from 'react-native-android-widget';

interface WidgetTodo {
  id: string;
  content: string;
  isCompleted: boolean;
  isOverdue: boolean;
  time?: string;
}

export async function renderTodoWidget(todos: WidgetTodo[], theme: 'light' | 'dark' = 'light') {
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#222222' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const subTextColor = isDark ? '#aaaaaa' : '#888888';
  const borderColor = isDark ? '#444444' : '#f0f0f0';
  const completedText = isDark ? '#888888' : '#aaaaaa';
  const itemText = isDark ? '#eeeeee' : '#333333';
  const checkboxBorder = isDark ? '#666666' : '#cccccc';

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
             clickActionData={{ uri: 'myplan://home?tab=todo' }}
          >
            <TextWidget
              text="待办事项"
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
        
        {todos.length === 0 ? (
          <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget
              text="🎉 今日待办已全部完成"
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
            {todos.map((todo, index) => (
              <FlexWidget
                key={todo.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: index < todos.length - 1 ? 0.5 : 0,
                  borderBottomColor: borderColor,
                  width: 'match_parent',
                }}
                clickAction="TOGGLE_TODO"
                clickActionData={{ todoId: todo.id }}
              >
                <FlexWidget
                  style={{
                    height: 24,
                    width: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: todo.isCompleted ? '#4CAF50' : checkboxBorder,
                    backgroundColor: todo.isCompleted ? '#4CAF50' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  {todo.isCompleted && (
                    <TextWidget
                      text="✓"
                      style={{
                        fontSize: 14,
                        color: '#ffffff',
                        fontWeight: 'bold',
                      }}
                    />
                  )}
                </FlexWidget>

                <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
                  <TextWidget
                    text={todo.content}
                    style={{
                      fontSize: 15,
                      color: todo.isCompleted ? completedText : itemText,
                      textDecorationLine: todo.isCompleted ? 'line-through' : 'none',
                      fontWeight: '400',
                    }}
                    maxLines={1}
                  />
                  {todo.time && (
                    <TextWidget
                      text={todo.time}
                      style={{
                        fontSize: 11,
                        color: todo.isOverdue ? '#ff4444' : subTextColor,
                        marginTop: 2,
                      }}
                    />
                  )}
                </FlexWidget>
              </FlexWidget>
            ))}
          </ListWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
