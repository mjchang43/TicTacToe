// Import the page's CSS. Webpack will know what to do with it.
import '../styles/app.css'

// Import libraries we need.
import { default as Web3 } from 'web3'
import { default as contract } from 'truffle-contract'
import $ from "jquery"

// Import our contract artifacts and turn them into usable abstractions.
import tictactoeArtifact from '../../build/contracts/TicTacToe.json'
import { callbackify } from 'util';

// MetaCoin is our usable abstraction, which we'll use through the code below.
const TicTacToe = contract(tictactoeArtifact)

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
let accounts
let account
let ticTacToeInstance
let nextPlayerEvent
let gameOverWithWinEvent
let gameOverWithDrawEvent

const App = {
  start: function () {
    const self = this

    // Bootstrap the MetaCoin abstraction for Use.
    TicTacToe.setProvider(web3.currentProvider)

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function (err, accs) {
      if (err != null) {
        alert('There was an error fetching your accounts.')
        return
      }

      if (accs.length === 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.")
        return
      }

      accounts = accs
      account = accounts[0]
    })
  },
  useAccountOne: function() {
      account = accounts[1]
  },
  createNewGame: function() {
    TicTacToe.new({from: account, value: web3.toWei(0.1,"ether"), gas: 3000000}).then(instance => {
      ticTacToeInstance = instance
      console.log(ticTacToeInstance)
      $(".in-game").show()
      $(".waiting-for-join").hide()
      $(".game-start").hide()
      $("#game-address").text(ticTacToeInstance.address)
      $("#waiting").show()
      $("#use-other-account").hide()
      
      var playerJoinedEvent = ticTacToeInstance.PlayerJoined()
      playerJoinedEvent.watch(function(error, eventObj){
        if(!error) {
            console.log(eventObj)
            $("#opponent-address").text(eventObj.args._player)
            $(".in-game").show()
        } else {
          console.error(error)
        }
        //playerJoinedEvent.stopWatching()
      })
      App.listenToEvents()
    }).catch(error => {
      console.error(error);
    })
  },
  joinGame: function() {
    var gameAddress = prompt("Address of the Game")
    if(gameAddress != null) {
    	TicTacToe.at(gameAddress).then(instance => {
        ticTacToeInstance = instance

	      return ticTacToeInstance.joinGame({from: account, value: web3.toWei(0.1,"ether"), gas: 3000000})
	    }).then(txResult => {
        
        $(".in-game").show()
        $(".game-start").hide()
        $("#game-address").text(ticTacToeInstance.address)
        $("#use-other-account").hide()
 
        ticTacToeInstance.player1.call().then(player1 => {
          $("#opponent-address").text(player1)
        })

        App.listenToEvents()
	      console.log(txResult)
	    })
    }
  },
  listenToEvents: function() {
    nextPlayerEvent = ticTacToeInstance.NextPlayer()
    nextPlayerEvent.watch(App.nextPlayer)

    gameOverWithWinEvent = ticTacToeInstance.GameOverWithWin()
    gameOverWithWinEvent.watch(App.gameOver)

    gameOverWithDrawEvent = ticTacToeInstance.GameOverWithDraw()
    gameOverWithDrawEvent.watch(App.gameOver)
  },
  nextPlayer: function(error, eventObj) {
    if(!error) {
      App.printBoard()
      console.log(eventObj)
      if(eventObj.args._player == account) {
        for(var i = 0; i <  3; i++) {
          for(var j = 0; j < 3; j++) {
            if($("#board")[0].children[0].children[i].children[j].innerHTML == "") {
              $($("#board")[0].children[0].children[i].children[j]).off('click').click({x:i, y:j}, App.setStone)
            }
          }
        }
        $("#your-turn").show()
        $("#waiting").hide()
      } else {
        $("#your-turn").hide()
        $("#waiting").show()
      }
    }else {
      console.error(error)
    }
  },
  gameOver: function(err, eventObj) {
    console.log("Game Over", eventObj);
    if(eventObj.event == "GameOverWithWin") {
      if(eventObj.args._winner == account) {
        alert("Congratulations, You Won!");
      } else {
        alert("Woops, you lost! Try again...");
      }
    } else {
      alert("That's a draw, oh my... next time you do beat'em!");
    }

    for(var i = 0; i < 3; i++) {
      for(var j = 0; j < 3; j++) {
            $("#board")[0].children[0].children[i].children[j].innerHTML = "";
      }
    }

    $(".in-game").hide();
    $(".game-start").show();
  },
  setStone: function(event) {
    ticTacToeInstance.setStone(event.data.x, event.data.y, {from: account}).then(txResult => {
      console.log(txResult)
      for(var i = 0; i <  3; i++) {
        for(var j = 0; j < 3; j++) {
          $($("#board")[0].children[0].children[i].children[j]).prop('onclick', null).off('click')
        }
      }
      App.printBoard()
      App.listenToEvents()
    })
  },
  printBoard: function() {
    ticTacToeInstance.getBoard.call().then(board => {
      for(var i = 0; i < board.length; i++) {
        for(var j = 0; j < board[i].length; j++) {
          if(board[i][j] == account) {
            $("#board")[0].children[0].children[i].children[j].innerHTML = "X"
          } else if (board[i][j] != 0) {
            $("#board")[0].children[0].children[i].children[j].innerHTML = "O"
          }
        }
      }
    })
  }
}

window.App = App

window.addEventListener('load', function () {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn(
      'Using web3 detected from external source.' +
      ' If you find that your accounts don\'t appear or you have 0 MetaCoin,' +
      ' ensure you\'ve configured that source properly.' +
      ' If using MetaMask, see the following link.' +
      ' Feel free to delete this warning. :)' +
      ' http://truffleframework.com/tutorials/truffle-and-metamask'
    )
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider)
  } else {
    console.warn(
      'No web3 detected. Falling back to http://127.0.0.1:9545.' +
      ' You should remove this fallback when you deploy live, as it\'s inherently insecure.' +
      ' Consider switching to Metamask for development.' +
      ' More info here: http://truffleframework.com/tutorials/truffle-and-metamask'
    )
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:9545'))
  }

  App.start()
})

