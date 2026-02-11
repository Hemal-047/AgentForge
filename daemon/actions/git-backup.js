function createBackupAction() {
  return {
    type: 'git_backup',
    category: 'ops',
    amountMist: 0,
    details: { repo: 'AgentForge', mode: 'auto-commit' },
  };
}

module.exports = { createBackupAction };
