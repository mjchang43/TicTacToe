pragma solidity ^0.4.24;

contract TicTacToe {
    uint constant public gameCost = 0.1 ether;
    uint8 public boardSize = 3;
    address[3][3] board;
    
    address public player1;
    address public player2;
    address activePlayer;
    address winner;
    
    bool gameActive;
    uint8 moveCounter;
    bool isDraw;
    uint balanceToWithdrawPlayer1;
    uint balanceToWithdrawPlayer2;
    uint timeToReact = 30 seconds;
    uint gameValidUtil;
    
    event PlayerJoined(address _player);
    event NextPlayer(address _player);
    event GameOverWithWin(address _winner);
    event GameOverWithDraw(bool _isDraw);
    event PayoutSuccess(address receiver, uint amountInWei);
    
    constructor() public payable {
        require(msg.value == gameCost);
        player1 = msg.sender;
        gameValidUtil = now + 3 minutes;
    }
    
    function joinGame() public payable {
        require(player2 == address(0));
        require(msg.value == gameCost);
        gameActive = true;
        player2 = msg.sender;
        activePlayer = player2;
        gameValidUtil = now + timeToReact;
    }
    
    function getBoard() public view returns(address[3][3]) {
        return board;
    }
    
    function setStone(uint8 x, uint8 y) public {
        assert(gameActive);
        require(board[x][y] == address(0));
        assert(x < boardSize);
        assert(y < boardSize);
        require(msg.sender == activePlayer);
        require(gameValidUtil > now);
        
        board[x][y] = msg.sender;
        moveCounter++;
        setWinner(x,y);
        
        if(gameActive && winner == address(0) && (moveCounter == boardSize**2)) {
            setDraw();
        }

        if(gameActive){
            if(activePlayer == player1) {
                activePlayer = player2;
            }else {
                activePlayer = player1;
            }
        }
        
        gameValidUtil = now + timeToReact;
    }
    
    function setWinner(uint8 x, uint8 y) private {
        bool rawLine = true;
        bool columnLine = true;
        bool diagonalLine = true;
        bool antiDiagonalLine = true;
        
        for(uint8 i = 0; i < boardSize; i++){
            if(rawLine && board[x][i] != activePlayer) {
                rawLine = false;
            }
            
            if(columnLine && board[i][y] != activePlayer) {
                columnLine = false;
            }
            
            if(diagonalLine && x == y && board[i][i] != activePlayer) {
                diagonalLine = false;
            }
            
            if(antiDiagonalLine && (x+y) == boardSize-1 && board[i][boardSize-1-i] != activePlayer ) {
                antiDiagonalLine = false;
            }
            
            /*for(uint8 j = 0; j < boardSize; j++) {
                if(board[i][j] == address(0)) {
                    break;
                }else if(i == boardSize-1 && j == boardSize-1) {
                    gameActive = false;
                }
            }*/
        }
        
        if(rawLine || columnLine || (diagonalLine && x==y) || (antiDiagonalLine && (x+y) == boardSize-1)) {
            gameActive = false;
            winner = activePlayer;
            uint balanceToPayOut = address(this).balance;
            if(!winner.send(balanceToPayOut)) {
                if(winner == player1) {
                    balanceToWithdrawPlayer1 = balanceToPayOut;
                }else {
                    balanceToWithdrawPlayer2 = balanceToPayOut;
                }
            }else {
               emit PayoutSuccess(winner, balanceToPayOut);
            }
            emit GameOverWithWin(winner);
            return;
        }
    }
    
    function setDraw() private {
        gameActive = false;
        isDraw = true;
        emit GameOverWithDraw(isDraw);
            
        uint balanceToPayOut = address(this).balance;
        if(!player1.send(balanceToPayOut)) {
            balanceToWithdrawPlayer1 = balanceToPayOut;
        }else {
            emit PayoutSuccess(player1, balanceToPayOut);
        }
            
        if(!player2.send(balanceToPayOut)) {
            balanceToWithdrawPlayer2 = balanceToPayOut;
        }else {
            emit PayoutSuccess(player2, balanceToPayOut);
        }
            
        return;
    }
    
    function getWinner() public view returns(address) {
        return winner;
    }
    
    function getIsDraw() public view returns(bool) {
        return isDraw;
    }
    
    function withdrawWin() public {
        if(msg.sender == player1) {
            require(balanceToWithdrawPlayer1 > 0);
            player1.transfer(balanceToWithdrawPlayer1);
            balanceToWithdrawPlayer1 = 0;
            emit PayoutSuccess(player1, balanceToWithdrawPlayer1);
        }else {
            require(balanceToWithdrawPlayer2 > 0);
            player2.transfer(balanceToWithdrawPlayer2);
            balanceToWithdrawPlayer2 = 0;
            emit PayoutSuccess(player2, balanceToWithdrawPlayer2);
        }
    }
    
    function emergencyCashout() public {
        require(gameActive);
        require(gameValidUtil <= now);
        setDraw();
    }
}
