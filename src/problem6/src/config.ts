export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret',
  masterSecret: process.env.MASTER_SECRET || 'default-master-secret',
  actionScores: {
    'task_complete': 10,
    'quiz_pass': 25,
    'challenge_win': 50,
    'boss_defeat': 100,
    'daily_login': 5,
  } as Record<string, number>
};
