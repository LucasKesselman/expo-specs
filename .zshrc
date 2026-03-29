export ZSH="$HOME/.oh-my-zsh"
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)
source $ZSH/oh-my-zsh.sh

# The next line updates PATH for the Google Cloud SDK.
if [ -f '/Users/lucaskesselman/Downloads/google-cloud-sdk/path.zsh.inc' ]; then . '/Users/lucaskesselman/Downloads/google-cloud-sdk/path.zsh.inc'; fi

# The next line enables shell command completion for gcloud.
if [ -f '/Users/lucaskesselman/Downloads/google-cloud-sdk/completion.zsh.inc' ]; then . '/Users/lucaskesselman/Downloads/google-cloud-sdk/completion.zsh.inc'; fi
